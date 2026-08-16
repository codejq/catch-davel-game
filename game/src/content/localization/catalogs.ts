export type ReleaseLocale = 'en' | 'ar';

export interface LocalizationCatalog {
  readonly schemaVersion: 1;
  readonly locale: ReleaseLocale;
  readonly direction: 'ltr' | 'rtl';
  readonly fallbackLocale: ReleaseLocale | null;
  readonly strings: Readonly<Record<string, string>>;
}

const ENGLISH_STRINGS = {
  'levels.001.name': 'First Wobble',
  'levels.001.briefing': 'Enter the neon workshop, recover its key, and deactivate the first dancing Davel crew.',
  'levels.002.name': 'Grinning Hall',
  'levels.002.briefing': 'Use the side passage to outflank the grinning patrol before it corners you.',
  'levels.003.name': 'Coin Circuit',
  'levels.003.briefing': 'Break the coin-running circuit and bank the Davels’ stolen change.',
  'levels.004.name': 'Wrong-Turn Boogie',
  'levels.004.briefing': 'Expect smiling ambushers, misleading turns, and a secret worth finding.',
  'levels.005.name': 'Foreman’s Two-Step',
  'levels.005.briefing': 'Hunt the firemouth foreman while its crew stomps through the workshop.',
  'levels.006.name': 'Conveyor Conga',
  'levels.006.briefing': 'Cross the moving conveyor lanes and break up the assembly-line conga.',
  'levels.007.name': 'Lights Out, Smiles On',
  'levels.007.briefing': 'Track reflective eyes through the blackout and do not trust the smiles.',
  'levels.008.name': 'Shift Change',
  'levels.008.briefing': 'Read the clockwork gates, split the mixed squad, and survive the shift change.',
  'levels.009.name': 'Workshop Rush',
  'levels.009.briefing': 'Hold the floor through two escalating waves before the whole workshop overruns you.',
  'levels.010.name': 'Chief Wobble',
  'levels.010.briefing': 'Face the Invoice Overlord and end Chief Wobble’s giant breakdown.',
  'objectives.deactivate_davels': 'Deactivate every dancing Davel',
  'objectives.level_002': 'Clear the Grinning Hall patrol',
  'objectives.level_003': 'Shut down the Coin Circuit crew',
  'objectives.level_004': 'Defeat the wrong-turn ambushers',
  'objectives.level_005': 'Deactivate the firemouth foreman',
  'objectives.level_006': 'Clear the Conveyor Conga',
  'objectives.level_007': 'Find and deactivate the blackout squad',
  'objectives.level_008': 'Survive the clockwork shift change',
  'objectives.level_009': 'Survive both Workshop Rush waves',
  'objectives.defeat_chief_wobble': 'Defeat Chief Wobble',
} as const;

const ARABIC_STRINGS: Readonly<Record<keyof typeof ENGLISH_STRINGS, string>> = {
  'levels.001.name': 'التمايل الأول',
  'levels.001.briefing': 'ادخل الورشة المتوهجة، واستعد مفتاحها، وعطّل أول فرقة من روبوتات دافل الراقصة.',
  'levels.002.name': 'قاعة الابتسامات',
  'levels.002.briefing': 'استخدم الممر الجانبي لمباغتة الدورية المبتسمة قبل أن تحاصرك.',
  'levels.003.name': 'دائرة العملات',
  'levels.003.briefing': 'اقطع دائرة نقل العملات واستعد النقود التي سرقتها روبوتات دافل.',
  'levels.004.name': 'رقصة المنعطف الخاطئ',
  'levels.004.briefing': 'توقّع كمائن مبتسمة ومنعطفات مضللة وسرًا يستحق الاكتشاف.',
  'levels.005.name': 'خطوتا المشرف',
  'levels.005.briefing': 'طارد مشرف قاذفات النار بينما يدبّ طاقمه في أرجاء الورشة.',
  'levels.006.name': 'كونغا الناقل',
  'levels.006.briefing': 'اعبر مسارات النقل المتحركة وأوقف رقصة خط التجميع.',
  'levels.007.name': 'الأنوار مطفأة والابتسامات باقية',
  'levels.007.briefing': 'تتبّع العيون العاكسة وسط الظلام ولا تثق بالابتسامات.',
  'levels.008.name': 'تبديل الوردية',
  'levels.008.briefing': 'اقرأ توقيت البوابات، وفرّق الفرقة المختلطة، وانجُ من تبديل الوردية.',
  'levels.009.name': 'اندفاع الورشة',
  'levels.009.briefing': 'اثبت أمام موجتين متصاعدتين قبل أن تجتاحك الورشة بأكملها.',
  'levels.010.name': 'الزعيم ووبل',
  'levels.010.briefing': 'واجه طاغية الفواتير وأنهِ عرض الزعيم ووبل العملاق.',
  'objectives.deactivate_davels': 'عطّل جميع روبوتات دافل الراقصة',
  'objectives.level_002': 'اقضِ على دورية قاعة الابتسامات',
  'objectives.level_003': 'أوقف طاقم دائرة العملات',
  'objectives.level_004': 'اهزم روبوتات كمين المنعطف الخاطئ',
  'objectives.level_005': 'عطّل مشرف قاذفات النار',
  'objectives.level_006': 'أوقف كونغا الناقل',
  'objectives.level_007': 'اعثر على فرقة الظلام وعطّلها',
  'objectives.level_008': 'انجُ من تبديل الوردية الآلي',
  'objectives.level_009': 'انجُ من موجتي اندفاع الورشة',
  'objectives.defeat_chief_wobble': 'اهزم الزعيم ووبل',
};

export const RELEASE_LOCALES = ['en', 'ar'] as const satisfies readonly ReleaseLocale[];

export const RELEASE_LOCALIZATION_CATALOGS = [
  { schemaVersion: 1, locale: 'en', direction: 'ltr', fallbackLocale: null, strings: ENGLISH_STRINGS },
  { schemaVersion: 1, locale: 'ar', direction: 'rtl', fallbackLocale: 'en', strings: ARABIC_STRINGS },
] as const satisfies readonly LocalizationCatalog[];
