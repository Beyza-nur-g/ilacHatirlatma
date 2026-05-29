// mongo --host localhost:27017 backend/scripts/mongo_init.js
const databaseName = process.env.DB_NAME || 'akilli_ilac';
const dbRef = db.getSiblingDB(databaseName);

[
  'patients',
  'family_members',
  'medications',
  'reminders',
  'logs',
  'chat_messages',
  'measurement_types',
  'measurements',
  'activity_events',
].forEach((collectionName) => {
  if (!dbRef.getCollectionNames().includes(collectionName)) {
    dbRef.createCollection(collectionName);
  }
});

dbRef.patients.createIndex({ email: 1 }, { unique: true, name: 'uq_patients_email' });
dbRef.family_members.createIndex({ owner_user_id: 1, created_at: -1 }, { name: 'idx_family_owner_created' });
dbRef.medications.createIndex({ uid: 1, member_id: 1, updated_at: -1 }, { name: 'idx_medications_uid_member_updated' });
dbRef.reminders.createIndex({ uid: 1, member_id: 1, enabled: 1 }, { name: 'idx_reminders_uid_member_enabled' });
dbRef.reminders.createIndex({ uid: 1, medication_id: 1 }, { name: 'idx_reminders_uid_medication' });
dbRef.logs.createIndex({ uid: 1, scheduled_at: -1 }, { name: 'idx_logs_uid_scheduled' });
dbRef.logs.createIndex({ uid: 1, member_id: 1 }, { name: 'idx_logs_uid_member' });
dbRef.logs.createIndex({ uid: 1, medication_id: 1 }, { name: 'idx_logs_uid_medication' });
dbRef.chat_messages.createIndex({ owner_user_id: 1, created_at: -1 }, { name: 'idx_chat_owner_created' });
dbRef.measurement_types.createIndex({ uid: 1, name: 1 }, { unique: true, name: 'uq_measurement_types_uid_name' });
dbRef.measurements.createIndex({ uid: 1, member_id: 1, measured_at: -1 }, { name: 'idx_measurements_uid_member_measured' });
dbRef.measurements.createIndex({ uid: 1, measurement_type_id: 1 }, { name: 'idx_measurements_uid_type' });
dbRef.activity_events.createIndex({ uid: 1, created_at: -1 }, { name: 'idx_activity_uid_created' });

print(`MongoDB hazirlandi: ${databaseName}`);
