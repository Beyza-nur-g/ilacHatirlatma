export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum Frequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  AS_NEEDED = 'as_needed',
}

export enum Weekday {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum LogAction {
  TAKEN = 'taken',
  SKIPPED = 'skipped',
  SNOOZED = 'snoozed',
  MISSED = 'missed',
}

export enum Relation {
  SELF = 'self',
  SPOUSE = 'spouse',
  MOTHER = 'mother',
  FATHER = 'father',
  SON = 'son',
  DAUGHTER = 'daughter',
  BROTHER = 'brother',
  SISTER = 'sister',
  OTHER = 'other',
}

export enum MedicationShape {
  CAPSULE = 'capsule',
  TABLET = 'tablet',
  SYRUP = 'syrup',
  INJECTION = 'injection',
  CREAM = 'cream',
  DROPS = 'drops',
}

export enum MealRule {
  NONE = 'none',
  HUNGRY = 'hungry',
  FULL_BEFORE_60 = 'full_before_60',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface Patient {
  uid: string;
  full_name: string;
  email: string;
  birth_date: string;
  gender: Gender;
  pregnancy_status: boolean;
  chronic_diseases: string[];
  allergies: string[];
  emergency_contact?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  owner_user_id: string;
  name: string;
  relation: Relation;
  birth_date?: string;
  note?: string;
  created_at: string;
}

export interface MedicationAppearance {
  shape: MedicationShape;
  color: string;
}

export interface Medication {
  id: string;
  uid: string;
  member_id?: string;
  name: string;
  active_ingredient?: string;
  dosage_text?: string;
  category?: string;
  usage_note?: string;
  barcode?: string;
  appearance: MedicationAppearance;
  created_at: string;
  updated_at: string;
}

export interface FamilyNotify {
  enabled: boolean;
  member_ids: string[];
}

export interface Reminder {
  id: string;
  uid: string;
  member_id?: string;
  medication_id: string;
  start_date: string;
  end_date?: string;
  times: string[];
  frequency: Frequency | string;
  weekly_days?: Weekday[];
  enabled: boolean;
  timezone: string;
  notify_before_minutes: number;
  meal_rule: MealRule | string;
  family_notify: FamilyNotify;
  created_at: string;
  updated_at: string;
}

export interface ReminderLog {
  id: string;
  uid: string;
  member_id?: string;
  reminder_id: string;
  medication_id: string;
  scheduled_at: string;
  action: LogAction;
  action_at: string;
  snooze_minutes?: number;
  created_at: string;
}

export interface ChatSuggestedAction {
  label: string;
  route: string;
  icon?: string;
}

export interface ChatMessage {
  id: string;
  owner_user_id: string;
  member_id?: string;
  role: 'user' | 'assistant';
  text: string;
  risk_level?: RiskLevel;
  safety_note?: string;
  suggested_actions?: ChatSuggestedAction[];
  created_at: string;
}

export interface ChatReply {
  reply: string;
  safety_note: string;
  risk_level: RiskLevel;
  suggested_actions: ChatSuggestedAction[];
  source: string;
}

export interface OCRAnalysis {
  detected_medicine_name: string;
  usage_area: string;
  warnings: string[];
  confidence: string;
  raw_analysis: string;
  patient_assessment: string;
  suitability: string;
  reasons: string[];
  matched_existing_medications: string[];
}

export interface MeasurementType {
  id: string;
  uid: string;
  name: string;
  unit: string;
  type: string;
  target_min?: number;
  target_max?: number;
  icon?: string;
  created_at: string;
}

export interface Measurement {
  id: string;
  uid: string;
  member_id?: string;
  measurement_type_id: string;
  value: number;
  note?: string;
  measured_at: string;
  created_at: string;
  type_name?: string;
  type_unit?: string;
  type_icon?: string;
  is_normal?: boolean;
}

export interface ActivityEvent {
  id: string;
  uid: string;
  member_id?: string;
  event_type: string;
  message: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DueDose {
  reminder_id: string;
  medication_id: string;
  medication_name: string;
  member_id?: string;
  time: string;
  status: string;
}

export interface DashboardSummary {
  medication_count: number;
  active_reminder_count: number;
  today_taken_count: number;
  today_total_dose_count: number;
  family_member_count: number;
  measurement_count: number;
  due_doses: DueDose[];
  recent_activity: ActivityEvent[];
}


export interface DeviceRegistration {
  expo_push_token: string;
  platform: string;
  device_name?: string;
  device_id?: string;
  app_version?: string;
}

export interface DeviceInfo extends DeviceRegistration {
  id: string;
  uid: string;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  uid: string;
  member_id?: string;
  reminder_id?: string;
  medication_id?: string;
  scheduled_at?: string;
  due_at: string;
  title: string;
  body: string;
  source: string;
  status: string;
  dedupe_key: string;
  device_count: number;
  success_count: number;
  failure_count: number;
  error?: string;
  ticket_ids: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  sent_at?: string;
}
