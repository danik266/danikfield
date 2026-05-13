export const MOCK_PLAYERS = [
  { name: 'ProSweeper', city: 'almaty', score: 28500, games: 342, winrate: 78, best: '01:23' },
  { name: 'MineMaster', city: 'astana', score: 24200, games: 289, winrate: 72, best: '01:45' },
  { name: 'BoomSlayer', city: 'moscow', score: 22100, games: 256, winrate: 69, best: '01:58' },
  { name: 'SafeClick', city: 'almaty', score: 19800, games: 198, winrate: 82, best: '02:12' },
  { name: 'FlagHunter', city: 'spb', score: 18400, games: 223, winrate: 65, best: '02:05' },
  { name: 'NoBoom', city: 'london', score: 17200, games: 187, winrate: 74, best: '02:30' },
  { name: 'MineWhiz', city: 'tokyo', score: 15900, games: 176, winrate: 71, best: '02:44' },
  { name: 'SweeperKing', city: 'nyc', score: 14500, games: 165, winrate: 67, best: '02:55' },
  { name: 'ClickSafe', city: 'almaty', score: 13200, games: 143, winrate: 76, best: '03:10' },
  { name: 'BombDefuser', city: 'moscow', score: 12800, games: 134, winrate: 63, best: '03:22' },
  { name: 'ProbMaster', city: 'astana', score: 11500, games: 121, winrate: 80, best: '03:15' },
  { name: 'ZenSweeper', city: 'london', score: 10200, games: 98, winrate: 85, best: '03:40' },
];

export const CITY_NAMES = {
  almaty: 'Алматы', astana: 'Астана', moscow: 'Москва',
  spb: 'СПб', london: 'Лондон', tokyo: 'Токио', nyc: 'Нью-Йорк'
};

export const ACHIEVEMENTS = [
  { id: 'first_win', icon: 'trophy', name: 'Первая победа', desc: 'Выиграйте первую игру', check: s => s.wins >= 1 },
  { id: 'speed_demon', icon: 'zap', name: 'Speed Demon', desc: 'Выиграйте за < 60 сек', check: s => s.bestTime > 0 && s.bestTime < 60 },
  { id: 'streak_3', icon: 'flame', name: 'На волне', desc: 'Серия из 3 побед', check: s => s.maxStreak >= 3 },
  { id: 'streak_10', icon: 'flame', name: 'Неостановим', desc: 'Серия из 10 побед', check: s => s.maxStreak >= 10 },
  { id: 'games_50', icon: 'gamepad-2', name: 'Ветеран', desc: 'Сыграйте 50 игр', check: s => s.totalGames >= 50 },
  { id: 'games_100', icon: 'crown', name: 'Легенда', desc: 'Сыграйте 100 игр', check: s => s.totalGames >= 100 },
  { id: 'no_flags', icon: 'ban', name: 'Без флагов', desc: 'Выиграйте без единого флага', check: s => s.noFlagWin },
  { id: 'daily_1', icon: 'calendar-check', name: 'Daily Player', desc: 'Завершите Daily Challenge', check: s => s.dailyCompleted >= 1 },
  { id: 'perfect', icon: 'gem', name: 'Перфекционист', desc: '100% точность в Daily', check: s => s.perfectDaily },
  { id: 'prob_master', icon: 'brain', name: 'Вероятностный мозг', desc: 'Используйте heatmap 10 раз', check: s => s.heatmapUses >= 10 },
  { id: 'combo_5', icon: 'zap', name: 'Combo x5', desc: 'Достигните комбо x5', check: s => s.maxCombo >= 5 },
  { id: 'xp_1000', icon: 'star', name: 'Тысячник', desc: 'Наберите 1000 XP', check: s => s.totalXP >= 1000 },
];

export const SKINS = [
  { id: 'default', name: 'Классика', preview: 'square', price: 'Бесплатно', owned: true },
  { id: 'neon', name: 'Неон', preview: 'sparkles', price: '200 XP', cost: 200 },
  { id: 'ocean', name: 'Океан', preview: 'waves', price: '300 XP', cost: 300 },
  { id: 'fire', name: 'Пламя', preview: 'flame', price: '400 XP', cost: 400 },
  { id: 'gold', name: 'Золото', preview: 'gem', price: 'PRO', pro: true },
  { id: 'diamond', name: 'Алмаз', preview: 'diamond', price: 'PRO', pro: true },
  { id: 'matrix', name: 'Матрица', preview: 'binary', price: 'PRO', pro: true },
  { id: 'cyber', name: 'Кибер', preview: 'cpu', price: 'PRO', pro: true },
];

export const THEMES = [
  { id: 'dark', name: 'Тёмная', colors: ['#111215','#d08c40','#2ec4b6'], owned: true },
  { id: 'midnight', name: 'Полночь', colors: ['#0d1b2a','#1b4965','#62b6cb'], price: '300 XP', cost: 300 },
  { id: 'sunset', name: 'Закат', colors: ['#1a0a1a','#e74c6c','#ffd93d'], price: '400 XP', cost: 400 },
  { id: 'forest', name: 'Лес', colors: ['#0a1a0a','#2d6a4f','#95d5b2'], price: 'PRO', pro: true },
  { id: 'sakura', name: 'Сакура', colors: ['#1a0a14','#c77dba','#ffb7c5'], price: 'PRO', pro: true },
];

export const DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
};

export const DAILY_DIFFICULTY = { rows: 16, cols: 16, mines: 40 };

export const COACH_MESSAGES = {
  start: [
    'Начни с угла или центра — шансы на большое открытие выше!',
    'Первый клик всегда безопасен. Удачи!',
    'Совет: начни с угла для максимального раскрытия.',
  ],
  safe: ['Отличный ход! Эта область выглядит безопасной.', 'Хорошо! Ты расчищаешь поле эффективно.', 'Продолжай в том же духе!'],
  risky: ['Осторожно! Рядом может быть мина.', 'Это рискованная зона. Собери больше информации.', 'Вероятность мины здесь повышена.'],
  flag_correct: ['Отличный флаг! Тут мина с высокой вероятностью.', 'Правильное решение поставить флаг!'],
  combo: ['Комбо! Играешь быстро и точно!', 'Серия! Продолжай в таком темпе!'],
  hint_safe: (r, c) => `Ячейка [${r+1}, ${c+1}] — самый безопасный выбор сейчас.`,
  hint_mine: (r, c) => `Ячейка [${r+1}, ${c+1}] — точно мина. Ставь флаг!`,
  analysis: (safe, risky) => `Анализ: ${safe} безопасных ячеек, ${risky} опасных зон.`,
};
