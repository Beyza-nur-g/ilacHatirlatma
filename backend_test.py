#!/usr/bin/env python3
"""
FAZ 1 MVP Backend API Test Suite
Tests all backend endpoints for the İlaç Hatırlatma (Drug Reminder) application
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os

# Backend URL from frontend .env
BACKEND_URL = "https://health-tracker-pro-11.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.medication_id = None
        self.reminder_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, message="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Add auth header if token exists
        if self.auth_token and headers is None:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
        elif self.auth_token and headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None
    
    def test_health_check(self):
        """Test health endpoint"""
        print("\n=== Testing Health Check ===")
        response = self.make_request("GET", "/health")
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok":
                self.log_test("Health Check", True, "Backend is healthy")
                return True
            else:
                self.log_test("Health Check", False, f"Unexpected response: {data}")
        else:
            status_code = response.status_code if response else "No response"
            self.log_test("Health Check", False, f"Health check failed with status: {status_code}")
        return False
    
    def test_user_registration(self):
        """Test user registration"""
        print("\n=== Testing User Registration ===")
        
        # Generate unique email for testing
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_user = {
            "full_name": "Ahmet Yılmaz",
            "email": f"ahmet.yilmaz.{timestamp}@test.com",
            "password": "test123456",
            "birth_date": "1990-05-15",
            "gender": "male",
            "pregnancy_status": False,
            "chronic_diseases": ["Hipertansiyon"],
            "allergies": ["Penisilin"]
        }
        
        response = self.make_request("POST", "/auth/register", test_user)
        
        if response and response.status_code == 201:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.auth_token = data["access_token"]
                self.user_data = data["user"]
                self.log_test("User Registration", True, f"User registered successfully: {self.user_data['email']}")
                return True
            else:
                self.log_test("User Registration", False, f"Missing token or user data: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("User Registration", False, f"Registration failed ({status_code}): {error_msg}")
        return False
    
    def test_user_login(self):
        """Test user login"""
        print("\n=== Testing User Login ===")
        
        if not self.user_data:
            self.log_test("User Login", False, "No user data available for login test")
            return False
            
        login_data = {
            "email": self.user_data["email"],
            "password": "test123456"
        }
        
        response = self.make_request("POST", "/auth/login", login_data, headers={})
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                # Update token with login token
                self.auth_token = data["access_token"]
                self.log_test("User Login", True, "Login successful")
                return True
            else:
                self.log_test("User Login", False, f"Missing access token: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("User Login", False, f"Login failed ({status_code}): {error_msg}")
        return False
    
    def test_get_profile(self):
        """Test get profile"""
        print("\n=== Testing Get Profile ===")
        
        response = self.make_request("GET", "/profile")
        
        if response and response.status_code == 200:
            data = response.json()
            if "uid" in data and "email" in data:
                self.log_test("Get Profile", True, f"Profile retrieved: {data['email']}")
                return True
            else:
                self.log_test("Get Profile", False, f"Missing profile data: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Get Profile", False, f"Get profile failed ({status_code}): {error_msg}")
        return False
    
    def test_update_profile(self):
        """Test update profile"""
        print("\n=== Testing Update Profile ===")
        
        update_data = {
            "chronic_diseases": ["Hipertansiyon", "Diyabet"],
            "allergies": ["Penisilin", "Aspirin"]
        }
        
        response = self.make_request("PUT", "/profile", update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if len(data.get("chronic_diseases", [])) == 2:
                self.log_test("Update Profile", True, "Profile updated successfully")
                return True
            else:
                self.log_test("Update Profile", False, f"Profile not updated correctly: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Update Profile", False, f"Update profile failed ({status_code}): {error_msg}")
        return False
    
    def test_create_medication(self):
        """Test create medication"""
        print("\n=== Testing Create Medication ===")
        
        medication_data = {
            "name": "Aspirin 100mg",
            "active_ingredient": "Asetilsalisilik Asit",
            "dosage_text": "Günde 1 tablet",
            "usage_note": "Yemekten sonra alınmalı",
            "barcode": "1234567890123"
        }
        
        response = self.make_request("POST", "/medications", medication_data)
        
        if response and response.status_code == 201:
            data = response.json()
            if "id" in data and data["name"] == medication_data["name"]:
                self.medication_id = data["id"]
                self.log_test("Create Medication", True, f"Medication created: {data['name']}")
                return True
            else:
                self.log_test("Create Medication", False, f"Medication data incorrect: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Create Medication", False, f"Create medication failed ({status_code}): {error_msg}")
        return False
    
    def test_get_medications(self):
        """Test get medications"""
        print("\n=== Testing Get Medications ===")
        
        response = self.make_request("GET", "/medications")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_test("Get Medications", True, f"Retrieved {len(data)} medications")
                return True
            else:
                self.log_test("Get Medications", False, f"No medications found or invalid format: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Get Medications", False, f"Get medications failed ({status_code}): {error_msg}")
        return False
    
    def test_update_medication(self):
        """Test update medication"""
        print("\n=== Testing Update Medication ===")
        
        if not self.medication_id:
            self.log_test("Update Medication", False, "No medication ID available")
            return False
            
        update_data = {
            "usage_note": "Yemekten sonra bol su ile alınmalı"
        }
        
        response = self.make_request("PUT", f"/medications/{self.medication_id}", update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("usage_note") == update_data["usage_note"]:
                self.log_test("Update Medication", True, "Medication updated successfully")
                return True
            else:
                self.log_test("Update Medication", False, f"Medication not updated correctly: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Update Medication", False, f"Update medication failed ({status_code}): {error_msg}")
        return False
    
    def test_create_reminder(self):
        """Test create reminder"""
        print("\n=== Testing Create Reminder ===")
        
        if not self.medication_id:
            self.log_test("Create Reminder", False, "No medication ID available")
            return False
            
        today = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        reminder_data = {
            "medication_id": self.medication_id,
            "start_date": today,
            "end_date": end_date,
            "times": ["08:00", "20:00"],
            "frequency": "daily",
            "enabled": True,
            "timezone": "Europe/Istanbul"
        }
        
        response = self.make_request("POST", "/reminders", reminder_data)
        
        if response and response.status_code == 201:
            data = response.json()
            if "id" in data and data["medication_id"] == self.medication_id:
                self.reminder_id = data["id"]
                self.log_test("Create Reminder", True, f"Reminder created for medication")
                return True
            else:
                self.log_test("Create Reminder", False, f"Reminder data incorrect: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Create Reminder", False, f"Create reminder failed ({status_code}): {error_msg}")
        return False
    
    def test_get_reminders(self):
        """Test get reminders"""
        print("\n=== Testing Get Reminders ===")
        
        response = self.make_request("GET", "/reminders")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_test("Get Reminders", True, f"Retrieved {len(data)} reminders")
                return True
            else:
                self.log_test("Get Reminders", False, f"No reminders found or invalid format: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Get Reminders", False, f"Get reminders failed ({status_code}): {error_msg}")
        return False
    
    def test_update_reminder(self):
        """Test update reminder"""
        print("\n=== Testing Update Reminder ===")
        
        if not self.reminder_id:
            self.log_test("Update Reminder", False, "No reminder ID available")
            return False
            
        update_data = {
            "times": ["09:00", "21:00"]
        }
        
        response = self.make_request("PUT", f"/reminders/{self.reminder_id}", update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("times") == update_data["times"]:
                self.log_test("Update Reminder", True, "Reminder updated successfully")
                return True
            else:
                self.log_test("Update Reminder", False, f"Reminder not updated correctly: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Update Reminder", False, f"Update reminder failed ({status_code}): {error_msg}")
        return False
    
    def test_toggle_reminder(self):
        """Test toggle reminder"""
        print("\n=== Testing Toggle Reminder ===")
        
        if not self.reminder_id:
            self.log_test("Toggle Reminder", False, "No reminder ID available")
            return False
            
        response = self.make_request("POST", f"/reminders/{self.reminder_id}/toggle")
        
        if response and response.status_code == 200:
            data = response.json()
            if "enabled" in data:
                self.log_test("Toggle Reminder", True, f"Reminder toggled to: {data['enabled']}")
                return True
            else:
                self.log_test("Toggle Reminder", False, f"Toggle response missing enabled field: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Toggle Reminder", False, f"Toggle reminder failed ({status_code}): {error_msg}")
        return False
    
    def test_create_log(self):
        """Test create log"""
        print("\n=== Testing Create Log ===")
        
        if not self.reminder_id or not self.medication_id:
            self.log_test("Create Log", False, "No reminder or medication ID available")
            return False
            
        log_data = {
            "reminder_id": self.reminder_id,
            "medication_id": self.medication_id,
            "scheduled_at": datetime.now().isoformat(),
            "action": "taken"
        }
        
        response = self.make_request("POST", "/logs", log_data)
        
        if response and response.status_code == 201:
            data = response.json()
            if "id" in data and data["action"] == "taken":
                self.log_test("Create Log", True, "Log created successfully")
                return True
            else:
                self.log_test("Create Log", False, f"Log data incorrect: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Create Log", False, f"Create log failed ({status_code}): {error_msg}")
        return False
    
    def test_get_logs(self):
        """Test get logs"""
        print("\n=== Testing Get Logs ===")
        
        response = self.make_request("GET", "/logs")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get Logs", True, f"Retrieved {len(data)} logs")
                return True
            else:
                self.log_test("Get Logs", False, f"Invalid logs format: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Get Logs", False, f"Get logs failed ({status_code}): {error_msg}")
        return False
    
    def test_get_logs_with_date_filter(self):
        """Test get logs with date filtering"""
        print("\n=== Testing Get Logs with Date Filter ===")
        
        today = datetime.now().strftime("%Y-%m-%d")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = self.make_request("GET", f"/logs?from_date={today}&to_date={tomorrow}")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get Logs with Date Filter", True, f"Retrieved {len(data)} logs with date filter")
                return True
            else:
                self.log_test("Get Logs with Date Filter", False, f"Invalid logs format: {data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Get Logs with Date Filter", False, f"Get logs with filter failed ({status_code}): {error_msg}")
        return False
    
    def test_delete_reminder(self):
        """Test delete reminder"""
        print("\n=== Testing Delete Reminder ===")
        
        if not self.reminder_id:
            self.log_test("Delete Reminder", False, "No reminder ID available")
            return False
            
        response = self.make_request("DELETE", f"/reminders/{self.reminder_id}")
        
        if response and response.status_code == 204:
            self.log_test("Delete Reminder", True, "Reminder deleted successfully")
            return True
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Delete Reminder", False, f"Delete reminder failed ({status_code}): {error_msg}")
        return False
    
    def test_delete_medication(self):
        """Test delete medication"""
        print("\n=== Testing Delete Medication ===")
        
        if not self.medication_id:
            self.log_test("Delete Medication", False, "No medication ID available")
            return False
            
        response = self.make_request("DELETE", f"/medications/{self.medication_id}")
        
        if response and response.status_code == 204:
            self.log_test("Delete Medication", True, "Medication deleted successfully")
            return True
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            status_code = response.status_code if response else "No response"
            self.log_test("Delete Medication", False, f"Delete medication failed ({status_code}): {error_msg}")
        return False
    
    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("🧪 Starting FAZ 1 MVP Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence as specified in the review request
        tests = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_profile,
            self.test_update_profile,
            self.test_create_medication,
            self.test_get_medications,
            self.test_update_medication,
            self.test_create_reminder,
            self.test_get_reminders,
            self.test_update_reminder,
            self.test_toggle_reminder,
            self.test_create_log,
            self.test_get_logs,
            self.test_get_logs_with_date_filter,
            self.test_delete_reminder,
            self.test_delete_medication
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL {test.__name__}: Exception occurred: {str(e)}")
                failed += 1
        
        # Summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total: {passed + failed}")
        print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%" if (passed+failed) > 0 else "0%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
        
        return passed, failed

def main():
    """Main test runner"""
    tester = BackendTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    sys.exit(1 if failed > 0 else 0)

if __name__ == "__main__":
    main()