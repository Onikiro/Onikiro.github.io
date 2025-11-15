// Основные переменные игры
let gameState = {
    player: {
        faction: 'seekers', // 'seekers', 'opg', 'mercenary'
        level: 5,
        money: 1247,
        reputation: 127,
        position: { x: 2, y: 2 },
        inventory: [],
        activeQuests: []
    },
    map: {
        hexSize: 6,
        hexes: {}
    },
    ui: {
        selectedHex: null,
        currentTab: 'map',
        activeModal: null
    },
    activities: {
        current: null,
        timer: null,
        progress: 0
    }
};

// Инициализация игры
document.addEventListener('DOMContentLoaded', function() {
    initializeBackground();
    generateHexMap();
    initializeUI();
    startGameLoop();
    
    // Показать модальное окно выбора фракции для новых игроков
    if (!localStorage.getItem('factionSelected')) {
        setTimeout(() => {
            document.getElementById('faction-modal').classList.remove('hidden');
        }, 1000);
    }
});

// Инициализация фоновой анимации
function initializeBackground() {
    VANTA.BIRDS({
        el: "#vanta-bg",
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        backgroundColor: 0x1a1a1a,
        color1: 0x4a6741,
        color2: 0xd4a574,
        birdSize: 1.20,
        wingSpan: 25.00,
        speedLimit: 3.00,
        separation: 20.00,
        alignment: 20.00,
        cohesion: 20.00,
        quantity: 3.00
    });
}

// Генерация hex-карты
function generateHexMap() {
    const hexGrid = document.getElementById('hex-grid');
    const hexTypes = ['neutral', 'controlled-seekers', 'controlled-opg'];
    
    // Очистка существующей карты
    hexGrid.innerHTML = '';
    
    // Генерация гексов
    for (let x = 0; x < 6; x++) {
        for (let y = 0; y < 6; y++) {
            const hex = document.createElement('div');
            hex.className = 'hex-cell';
            hex.dataset.x = x;
            hex.dataset.y = y;
            
            // Определение типа гекса
            let hexType = 'neutral';
            if (x === 1 && y === 1) {
                hexType = 'controlled-seekers player-base';
            } else if (x === 4 && y === 4) {
                hexType = 'controlled-opg';
            } else if (Math.random() < 0.3) {
                hexType = Math.random() < 0.5 ? 'controlled-seekers' : 'controlled-opg';
            }
            
            hex.className += ` ${hexType}`;
            
            // Добавление иконки активности
            const activityIcon = getRandomActivityIcon();
            if (activityIcon && Math.random() < 0.4) {
                hex.innerHTML = `<span class="text-xs">${activityIcon}</span>`;
            }
            
            // Добавление обработчика клика
            hex.addEventListener('click', () => selectHex(x, y));
            
            hexGrid.appendChild(hex);
            
            // Сохранение информации о гексе
            gameState.map.hexes[`${x},${y}`] = {
                x, y,
                type: hexType,
                control: hexType.includes('seekers') ? 'seekers' : 
                        hexType.includes('opg') ? 'opg' : 'neutral',
                pvp: Math.random() < 0.2,
                activities: generateActivities(),
                resources: Math.floor(Math.random() * 100) + 50
            };
        }
    }
}

// Получение случайной иконки активности
function getRandomActivityIcon() {
    const icons = ['🔍', '⚔️', '⚡', '🛡️', '💰', '📦', '🎯'];
    return icons[Math.floor(Math.random() * icons.length)];
}

// Генерация доступных активностей для гекса
function generateActivities() {
    const activities = [];
    const types = ['scavenge', 'patrol', 'artifact', 'defend', 'attack', 'trade'];
    
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
        activities.push({
            type: types[Math.floor(Math.random() * types.length)],
            difficulty: Math.floor(Math.random() * 5) + 1,
            reward: Math.floor(Math.random() * 100) + 20,
            duration: [5, 15, 30, 60][Math.floor(Math.random() * 4)]
        });
    }
    
    return activities;
}

// Выбор гекса
function selectHex(x, y) {
    // Удаление предыдущего выделения
    document.querySelectorAll('.hex-cell').forEach(cell => {
        cell.classList.remove('selected');
    });
    
    // Выделение нового гекса
    const hex = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    hex.classList.add('selected');
    
    // Обновление информации о локации
    updateLocationInfo(x, y);
    
    gameState.ui.selectedHex = { x, y };
}

// Обновление информации о локации
function updateLocationInfo(x, y) {
    const hexData = gameState.map.hexes[`${x},${y}`];
    if (!hexData) return;
    
    document.getElementById('location-name').textContent = `Гекс (${x}, ${y})`;
    document.getElementById('location-coords').textContent = `{${x}, ${y}}`;
    document.getElementById('location-control').textContent = 
        hexData.control === 'seekers' ? 'Искатели' :
        hexData.control === 'opg' ? 'ОПГ' : 'Нейтрально';
    document.getElementById('location-pvp').textContent = hexData.pvp ? 'Включен' : 'Выключен';
    
    // Показать доступные действия
    const actionsDiv = document.getElementById('location-actions');
    actionsDiv.classList.remove('hidden');
    
    // Обновить кнопки действий в зависимости от доступных активностей
    updateActionButtons(hexData);
}

// Обновление кнопок действий
function updateActionButtons(hexData) {
    const buttons = document.querySelectorAll('#location-actions button');
    
    buttons.forEach(button => {
        const activityType = button.getAttribute('onclick').match(/'([^']+)'/)[1];
        const hasActivity = hexData.activities.some(a => a.type === activityType);
        
        if (hasActivity) {
            button.style.display = 'block';
            button.disabled = false;
        } else {
            button.style.display = 'none';
            button.disabled = true;
        }
    });
}

// Начать активность
function startActivity(type) {
    const activities = {
        scavenge: {
            title: 'Поиск ресурсов',
            description: 'Обыскиваем локацию в поисках полезных ресурсов и материалов.',
            duration: 5,
            reward: { money: 25, items: ['батарейка', 'медпак'] },
            icon: '🔍'
        },
        patrol: {
            title: 'Патруль мутантов',
            description: 'Патрулируем территорию и уничтожаем мутантов.',
            duration: 15,
            reward: { money: 50, reputation: 5 },
            icon: '⚔️'
        },
        artifact: {
            title: 'Поиск артефактов',
            description: 'Используем детектор для поиска редких артефактов.',
            duration: 30,
            reward: { money: 100, items: ['артефакт'], reputation: 10 },
            icon: '⚡'
        },
        defend: {
            title: 'Защита аванпоста',
            description: 'Участвуем в обороне стратегического аванпоста.',
            duration: 20,
            reward: { reputation: 15, influence: 5 },
            icon: '🛡️'
        },
        attack: {
            title: 'Атака аванпоста',
            description: 'Атакуем вражеский аванпост для расширения контроля.',
            duration: 25,
            reward: { reputation: 20, influence: 10 },
            icon: '⚔️'
        }
    };
    
    const activity = activities[type];
    if (!activity) return;
    
    showActivityModal(activity);
}

// Показать модальное окно активности
function showActivityModal(activity) {
    const modal = document.getElementById('activity-modal');
    const title = document.getElementById('activity-title');
    const content = document.getElementById('activity-content');
    
    title.textContent = activity.title;
    content.innerHTML = `
        <div class="text-center mb-4">
            <div class="text-4xl mb-2">${activity.icon}</div>
            <p class="text-gray-300 mb-4">${activity.description}</p>
            <div class="bg-gray-700 rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-400">Длительность:</span>
                    <span class="font-semibold">${activity.duration} мин</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-400">Награды:</span>
                    <span class="text-green-400">${formatRewards(activity.reward)}</span>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    gameState.ui.activeModal = 'activity';
    gameState.activities.current = activity;
}

// Форматирование наград
function formatRewards(reward) {
    const rewards = [];
    if (reward.money) rewards.push(`₽${reward.money}`);
    if (reward.reputation) rewards.push(`+${reward.reputation} реп.`);
    if (reward.influence) rewards.push(`+${reward.influence} влияния`);
    if (reward.items) rewards.push(...reward.items);
    return rewards.join(', ');
}

// Подтверждение начала активности
function confirmActivity() {
    const activity = gameState.activities.current;
    if (!activity) return;
    
    closeActivityModal();
    
    // Показать уведомление о начале активности
    showNotification(`Начинается: ${activity.title}`, 'info');
    
    // Симуляция выполнения активности
    setTimeout(() => {
        completeActivity(activity);
    }, activity.duration * 1000); // Ускоренное время для демонстрации
}

// Завершение активности
function completeActivity(activity) {
    // Начисление наград
    if (activity.reward.money) {
        gameState.player.money += activity.reward.money;
        updatePlayerStats();
    }
    
    // Показать уведомление о завершении
    showNotification(`Завершено: ${activity.title}! Награды: ${formatRewards(activity.reward)}`, 'success');
    
    // Обновить ежедневные задания
    updateDailyQuests();
}

// Использование фракционной способности
function useFactionAbility(ability) {
    if (gameState.player.faction === 'seekers' && ability === 'scan') {
        showNotification('Сканирование местности... Найден артефакт!', 'success');
        gameState.player.inventory.push('артефакт');
        updatePlayerStats();
    }
}

// Присоединиться к фракционному событию
function joinFactionEvent() {
    showNotification('Вы присоединились к рейду! Сбор отряда через 10 минут.', 'info');
    
    // Симуляция события
    setTimeout(() => {
        const success = Math.random() > 0.3;
        if (success) {
            showNotification('Рейд прошел успешно! +50 репутации', 'success');
            gameState.player.reputation += 50;
            updatePlayerStats();
        } else {
            showNotification('Рейд провален. Попробуйте еще раз.', 'error');
        }
    }, 10000);
}

// Выбор фракции
function selectFaction(faction) {
    gameState.player.faction = faction;
    localStorage.setItem('factionSelected', 'true');
    localStorage.setItem('playerFaction', faction);
    
    // Обновить UI
    updateFactionUI();
    
    // Закрыть модальное окно
    document.getElementById('faction-modal').classList.add('hidden');
    
    // Показать приветственное сообщение
    const factionNames = {
        'seekers': 'Искатели',
        'opg': 'ОПГ'
    };
    showNotification(`Добро пожаловать в фракцию ${factionNames[faction]}!`, 'success');
    
    // Перенаправление на экран фракции после выбора
    setTimeout(() => {
        window.location.href = 'faction.html';
    }, 2000);
}

// Обновление UI фракции
function updateFactionUI() {
    const factionInfo = document.getElementById('faction-info');
    const isSeekers = gameState.player.faction === 'seekers';
    
    factionInfo.innerHTML = `
        <div class="flex items-center space-x-3 mb-3">
            <div class="w-8 h-8 ${isSeekers ? 'bg-blue-600' : 'bg-red-600'} rounded-full flex items-center justify-center">
                <span class="text-white font-bold text-sm">${isSeekers ? 'И' : 'О'}</span>
            </div>
            <div>
                <div class="font-semibold">${isSeekers ? 'Искатели' : 'ОПГ'}</div>
                <div class="text-xs text-gray-400">Уровень репутации: ${gameState.player.reputation}</div>
            </div>
        </div>
        
        <div class="space-y-2 text-sm">
            ${isSeekers ? `
                <div class="flex items-center justify-between">
                    <span class="text-gray-400">Artifact Sense:</span>
                    <span class="text-green-400">+15% к редкому луту</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-gray-400">Fortify:</span>
                    <span class="text-green-400">+20% к защите</span>
                </div>
            ` : `
                <div class="flex items-center justify-between">
                    <span class="text-gray-400">Fast Raid:</span>
                    <span class="text-green-400">+10% к скорости сбора</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-gray-400">Extortion:</span>
                    <span class="text-green-400">Налог на проходящих</span>
                </div>
            `}
        </div>
        
        <div class="mt-3 space-y-2">
            <button class="activity-button w-full py-2 text-xs" onclick="useFactionAbility('${isSeekers ? 'scan' : 'ambush'}')">
                ${isSeekers ? '🔍 Сканировать местность' : '💀 Устроить засаду'}
            </button>
        </div>
    `;
}

// Обновление статистики игрока
function updatePlayerStats() {
    document.getElementById('player-level').textContent = gameState.player.level;
    document.getElementById('player-money').textContent = gameState.player.money.toLocaleString();
    
    // Сохранение в localStorage
    localStorage.setItem('playerMoney', gameState.player.money.toString());
    localStorage.setItem('playerLevel', gameState.player.level.toString());
    localStorage.setItem('playerReputation', gameState.player.reputation.toString());
}

// Обновление ежедневных заданий
function updateDailyQuests() {
    // Простая логика обновления заданий
    const progress = Math.min(100, (gameState.player.reputation / 200) * 100);
    document.querySelector('.progress-fill').style.width = `${progress}%`;
}

// Показать уведомление
function showNotification(message, type = 'info') {
    const notifications = document.getElementById('notifications');
    const notification = document.createElement('div');
    
    const colors = {
        'info': 'bg-blue-600',
        'success': 'bg-green-600',
        'error': 'bg-red-600',
        'warning': 'bg-yellow-600'
    };
    
    notification.className = `notification ${colors[type] || colors.info}`;
    notification.textContent = message;
    
    notifications.appendChild(notification);
    
    // Автоматическое удаление уведомления
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Переключение вкладок
function showTab(tabName) {
    // Обновить активную вкладку в навигации
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('text-blue-400');
        btn.classList.add('text-gray-400');
    });
    
    event.target.closest('button').classList.remove('text-gray-400');
    event.target.closest('button').classList.add('text-blue-400');
    
    gameState.ui.currentTab = tabName;
    
    // Навигация между экранами
    const pages = {
        'map': 'index.html',
        'faction': 'faction.html',
        'inventory': 'inventory.html',
        'social': 'social.html',
        'arena': 'arena.html',
        'quests': 'quests.html',
        'clan': 'clan.html',
        'casino': 'casino.html'
    };
    
    if (pages[tabName] && tabName !== 'map') {
        window.location.href = pages[tabName];
    }
    
    showNotification(`Переключение на вкладку: ${tabName}`, 'info');
}

// Закрытие модального окна активности
function closeActivityModal() {
    document.getElementById('activity-modal').classList.add('hidden');
    gameState.ui.activeModal = null;
    gameState.activities.current = null;
}

// Инициализация UI
function initializeUI() {
    // Восстановление состояния из localStorage
    const savedFaction = localStorage.getItem('playerFaction');
    const savedMoney = localStorage.getItem('playerMoney');
    const savedLevel = localStorage.getItem('playerLevel');
    const savedReputation = localStorage.getItem('playerReputation');
    
    if (savedFaction) {
        gameState.player.faction = savedFaction;
        updateFactionUI();
    }
    
    if (savedMoney) {
        gameState.player.money = parseInt(savedMoney);
    }
    
    if (savedLevel) {
        gameState.player.level = parseInt(savedLevel);
    }
    
    if (savedReputation) {
        gameState.player.reputation = parseInt(savedReputation);
    }
    
    updatePlayerStats();
    
    // Добавление обработчиков для фильтров карты
    document.getElementById('map-filter-all').addEventListener('click', () => filterMap('all'));
    document.getElementById('map-filter-controlled').addEventListener('click', () => filterMap('controlled'));
    document.getElementById('map-filter-activities').addEventListener('click', () => filterMap('activities'));
}

// Фильтрация карты
function filterMap(filter) {
    const hexes = document.querySelectorAll('.hex-cell');
    
    hexes.forEach(hex => {
        switch (filter) {
            case 'all':
                hex.style.opacity = '1';
                break;
            case 'controlled':
                const isControlled = hex.classList.contains('controlled-seekers') || 
                                   hex.classList.contains('controlled-opg');
                hex.style.opacity = isControlled ? '1' : '0.3';
                break;
            case 'activities':
                const hasActivity = hex.innerHTML.includes('span');
                hex.style.opacity = hasActivity ? '1' : '0.3';
                break;
        }
    });
    
    // Обновить активный фильтр
    document.querySelectorAll('[id^="map-filter-"]').forEach(btn => {
        btn.classList.remove('bg-blue-600');
        btn.classList.add('bg-gray-700');
    });
    
    document.getElementById(`map-filter-${filter}`).classList.remove('bg-gray-700');
    document.getElementById(`map-filter-${filter}`).classList.add('bg-blue-600');
}

// Игровой цикл
function startGameLoop() {
    // Обновление каждые 30 секунд
    setInterval(() => {
        // Случайные события
        if (Math.random() < 0.1) {
            const events = [
                'Новый артефакт обнаружен в Зоне!',
                'Вражеский отряд приближается к вашей территории',
                'Торговец прибыл в ближайший лагерь',
                'Погода в Зоне ухудшилась'
            ];
            showNotification(events[Math.floor(Math.random() * events.length)], 'info');
        }
        
        // Обновление контроля территорий
        updateTerritoryControl();
        
        // Пассивный доход
        if (gameState.player.faction !== 'mercenary') {
            const passiveIncome = Math.floor(Math.random() * 10) + 5;
            gameState.player.money += passiveIncome;
            updatePlayerStats();
        }
    }, 30000);
}

// Обновление контроля территорий
function updateTerritoryControl() {
    // Простая симуляция изменения контроля
    Object.keys(gameState.map.hexes).forEach(key => {
        const hex = gameState.map.hexes[key];
        if (hex.control !== 'neutral' && Math.random() < 0.05) {
            // Маленький шанс изменения контроля
            hex.control = hex.control === 'seekers' ? 'opg' : 'seekers';
            
            // Обновить визуальное отображение
            const hexElement = document.querySelector(`[data-x="${hex.x}"][data-y="${hex.y}"]`);
            if (hexElement) {
                hexElement.className = `hex-cell ${hex.control === 'seekers' ? 'controlled-seekers' : 'controlled-opg'}`;
            }
        }
    });
}