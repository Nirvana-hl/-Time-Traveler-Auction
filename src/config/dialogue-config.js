// 首次登录剧情对话配置
export const firstLoginDialogue = {
  // 支持多语言
  languages: {
    'zh-CN': {
      title: '时空旅人拍卖会',
      dialogues: [
        {
          character: '大木博士',
          text: '你好，新晋时空旅人！我是大木博士，欢迎你加入我们研究时空裂隙的研究。',
          emotion: 'welcome'
        },
        {
          character: '大木博士',
          text: '在20xx年,我们意外发现了这个连接各个时代的时空裂隙,里面有来自不同平行宇宙的人参加的拍卖会。',
          emotion: 'explain'
        },
        {
          character: '大木博士',
          text: '现在，你将参与这场跨越千年的珍品拍卖会，收集来自不同时代的独特宝物,将它们带回来。',
          emotion: 'excited'
        },
        {
          character: '大木博士',
          text: '但要小心，神秘组织正试图参加拍卖行，带走高价值的宝物。我们需要你的帮助！',
          emotion: 'serious'
        },
        {
          character: '大木博士',
          text: '运用你的拍卖技巧，尽可能待会最高价值的宝物回来，你准备好了吗',
          emotion: 'challenge'
        }
      ],
      buttonText: '开始冒险 →'
    },
    'en-US': {
      title: 'Time Traveler Auction',
      dialogues: [
        {
          character: 'Dr. Alina',
          text: 'Welcome, new time traveler! I am Dr. Alina, the discoverer of the temporal rift.',
          emotion: 'welcome'
        },
        {
          character: 'Dr. Alina',
          text: 'In the 2045 experiment, I accidentally opened a temporal rift connecting different eras.',
          emotion: 'explain'
        },
        {
          character: 'Dr. Alina',
          text: 'Now, you will participate in a millennium-spanning auction to collect unique treasures from different times.',
          emotion: 'excited'
        },
        {
          character: 'Dr. Alina',
          text: 'But be careful! The mysterious organization "Time Raiders" is trying to alter history. We need your help!',
          emotion: 'serious'
        },
        {
          character: 'Dr. Alina',
          text: 'Collect the legendary artifacts from five eras and uncover the ultimate mystery of human civilization. Are you ready?',
          emotion: 'challenge'
        }
      ],
      buttonText: 'Start Adventure →'
    }
  },
  
  // 角色配置
  characters: {
    '大木博士': {
      image: '/images/guide.png',
      position: 'right',
      color: '#3b82f6'
    },
    'Dr. Alina': {
      image: '/images/guide.png',
      position: 'right',
      color: '#3b82f6'
    }
  },
  
  // 动画配置
  animations: {
    fadeInDuration: 500,
    textTypingSpeed: 30,
    characterSlideDuration: 600
  }
};

// 本地存储键名
export const STORAGE_KEYS = {
  DIALOGUE_SKIP: 'time_traveler_dialogue_skip',
  LANGUAGE_PREFERENCE: 'time_traveler_language'
};

// 获取当前语言
export function getCurrentLanguage() {
  const savedLang = localStorage.getItem(STORAGE_KEYS.LANGUAGE_PREFERENCE);
  const browserLang = navigator.language || 'zh-CN';
  return savedLang || (browserLang.startsWith('zh') ? 'zh-CN' : 'en-US');
}

// 设置语言
export function setLanguage(lang) {
  localStorage.setItem(STORAGE_KEYS.LANGUAGE_PREFERENCE, lang);
}

// 检查是否跳过对话
export function shouldSkipDialogue() {
  return localStorage.getItem(STORAGE_KEYS.DIALOGUE_SKIP) === 'true';
}

// 设置跳过对话选项
export function setSkipDialogue(skip) {
  localStorage.setItem(STORAGE_KEYS.DIALOGUE_SKIP, skip.toString());
}