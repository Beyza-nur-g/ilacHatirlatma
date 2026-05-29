import { Frequency, Gender, MealRule, MedicationShape, Relation, Weekday } from '../models';

export const genderOptions = [
  { label: 'Erkek', value: Gender.MALE },
  { label: 'Kadin', value: Gender.FEMALE },
  { label: 'Diger', value: Gender.OTHER },
];

export const relationOptions = [
  { label: 'Es', value: Relation.SPOUSE },
  { label: 'Anne', value: Relation.MOTHER },
  { label: 'Baba', value: Relation.FATHER },
  { label: 'Ogul', value: Relation.SON },
  { label: 'Kiz', value: Relation.DAUGHTER },
  { label: 'Erkek Kardes', value: Relation.BROTHER },
  { label: 'Kiz Kardes', value: Relation.SISTER },
  { label: 'Diger', value: Relation.OTHER },
];

export const relationLabels: Record<string, string> = {
  [Relation.SELF]: 'Ben',
  [Relation.SPOUSE]: 'Es',
  [Relation.MOTHER]: 'Anne',
  [Relation.FATHER]: 'Baba',
  [Relation.SON]: 'Ogul',
  [Relation.DAUGHTER]: 'Kiz',
  [Relation.BROTHER]: 'Erkek Kardes',
  [Relation.SISTER]: 'Kiz Kardes',
  [Relation.OTHER]: 'Diger',
};

export const medicationShapeOptions = [
  { label: 'Tablet', value: MedicationShape.TABLET },
  { label: 'Kapsul', value: MedicationShape.CAPSULE },
  { label: 'Surup', value: MedicationShape.SYRUP },
  { label: 'Igne', value: MedicationShape.INJECTION },
  { label: 'Krem', value: MedicationShape.CREAM },
  { label: 'Damla', value: MedicationShape.DROPS },
];

export const medicationShapeLabels: Record<string, string> = {
  [MedicationShape.TABLET]: 'Tablet',
  [MedicationShape.CAPSULE]: 'Kapsul',
  [MedicationShape.SYRUP]: 'Surup',
  [MedicationShape.INJECTION]: 'Igne',
  [MedicationShape.CREAM]: 'Krem',
  [MedicationShape.DROPS]: 'Damla',
};

export const frequencyOptions = [
  { label: 'Her gun', value: Frequency.DAILY },
  { label: 'Haftalik', value: Frequency.WEEKLY },
  { label: 'Gerektiginde', value: Frequency.AS_NEEDED },
];

export const frequencyLabels: Record<string, string> = {
  [Frequency.DAILY]: 'Her gun',
  [Frequency.WEEKLY]: 'Haftalik',
  [Frequency.AS_NEEDED]: 'Gerektiginde',
};

export const mealRuleOptions = [
  { label: 'Yemekle bagimsiz', value: MealRule.NONE },
  { label: 'Ac karnina', value: MealRule.HUNGRY },
  { label: 'Yemekten 60 dk once/sonra tok', value: MealRule.FULL_BEFORE_60 },
];

export const mealRuleLabels: Record<string, string> = {
  [MealRule.NONE]: 'Yemekle bagimsiz',
  [MealRule.HUNGRY]: 'Ac karnina',
  [MealRule.FULL_BEFORE_60]: 'Tok / 60 dk kurali',
};

export const weekdayOptions = [
  { label: 'Pzt', value: Weekday.MONDAY },
  { label: 'Sali', value: Weekday.TUESDAY },
  { label: 'Cars', value: Weekday.WEDNESDAY },
  { label: 'Pers', value: Weekday.THURSDAY },
  { label: 'Cum', value: Weekday.FRIDAY },
  { label: 'Cts', value: Weekday.SATURDAY },
  { label: 'Paz', value: Weekday.SUNDAY },
];

export const colorPalette = [
  '#4A90E2',
  '#50C878',
  '#F59E0B',
  '#E5484D',
  '#8B5CF6',
  '#0EA5E9',
  '#F97316',
  '#EC4899',
  '#10B981',
  '#64748B',
];

export const measurementTypePresets = [
  { name: 'Kan Sekeri', unit: 'mg/dL', icon: 'water', target_min: 70, target_max: 140 },
  { name: 'Tansiyon', unit: 'mmHg', icon: 'heart', target_min: 90, target_max: 140 },
  { name: 'Nabiz', unit: 'bpm', icon: 'pulse', target_min: 60, target_max: 100 },
  { name: 'Ates', unit: '°C', icon: 'thermometer', target_min: 36, target_max: 37.5 },
  { name: 'Kilo', unit: 'kg', icon: 'scale' },
  { name: 'Oksijen', unit: '%', icon: 'medical', target_min: 95, target_max: 100 },
];
