import requests
import sys
import json
from datetime import datetime

class SurveyPortalAPITester:
    def __init__(self, base_url="https://survey-portal-6.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {"status": "success"}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_register(self):
        """Test user registration"""
        timestamp = int(datetime.now().timestamp())
        test_data = {
            "email": f"testuser{timestamp}@example.com",
            "password": "test123456",
            "name": "Test User"
        }
        
        result = self.run_test("User Registration", "POST", "auth/register", 200, test_data)
        if result and 'token' in result:
            self.token = result['token']
            self.user_id = result['user']['user_id']
            return True
        return False

    def test_login(self):
        """Test user login with existing credentials"""
        test_data = {
            "email": "testuser@example.com",
            "password": "test123456"
        }
        
        result = self.run_test("User Login", "POST", "auth/login", 200, test_data)
        if result and 'token' in result:
            self.token = result['token']
            self.user_id = result['user']['user_id']
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        result = self.run_test("Get Current User", "GET", "auth/me", 200)
        return result is not None

    def test_get_surveys(self):
        """Test get available surveys"""
        result = self.run_test("Get Surveys", "GET", "surveys", 200)
        if result and isinstance(result, list):
            print(f"   Found {len(result)} available surveys")
            return True
        return False

    def test_start_survey(self):
        """Test starting a survey"""
        # First get available surveys
        surveys = self.run_test("Get Surveys for Start", "GET", "surveys", 200)
        if not surveys or len(surveys) == 0:
            self.log_test("Start Survey", False, "No surveys available to start")
            return None
            
        survey_id = surveys[0]['survey_id']
        test_data = {"survey_id": survey_id}
        
        result = self.run_test("Start Survey", "POST", "surveys/start", 200, test_data)
        if result:
            return survey_id
        return None

    def test_complete_survey(self, survey_id):
        """Test completing a survey"""
        if not survey_id:
            self.log_test("Complete Survey", False, "No survey ID provided")
            return False
            
        test_data = {"survey_id": survey_id}
        result = self.run_test("Complete Survey", "POST", "surveys/complete", 200, test_data)
        return result is not None

    def test_survey_history(self):
        """Test get survey history"""
        result = self.run_test("Survey History", "GET", "surveys/history", 200)
        return result is not None

    def test_get_stats(self):
        """Test get user stats"""
        result = self.run_test("User Stats", "GET", "stats", 200)
        return result is not None

    def test_get_wallet(self):
        """Test get wallet info"""
        result = self.run_test("Wallet Info", "GET", "wallet", 200)
        return result is not None

    def test_withdrawal_request(self):
        """Test withdrawal request"""
        test_data = {
            "amount": 500,
            "method": "paypal",
            "account_details": "test@example.com"
        }
        
        result = self.run_test("Withdrawal Request", "POST", "withdrawals", 200, test_data)
        return result is not None

    def test_get_withdrawals(self):
        """Test get withdrawals"""
        result = self.run_test("Get Withdrawals", "GET", "withdrawals", 200)
        return result is not None

    def test_get_leaderboard(self):
        """Test get leaderboard"""
        result = self.run_test("Leaderboard", "GET", "leaderboard", 200)
        return result is not None

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Survey Portal API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Test root endpoint
        self.test_root_endpoint()

        # Test authentication flow
        if not self.test_register():
            # If registration fails, try login with existing user
            if not self.test_login():
                print("❌ Authentication failed, stopping tests")
                return False

        # Test protected endpoints
        self.test_get_me()
        self.test_get_surveys()
        
        # Test survey flow
        survey_id = self.test_start_survey()
        if survey_id:
            self.test_complete_survey(survey_id)
        
        self.test_survey_history()
        self.test_get_stats()
        
        # Test wallet functionality
        self.test_get_wallet()
        self.test_withdrawal_request()
        self.test_get_withdrawals()
        
        # Test leaderboard
        self.test_get_leaderboard()

        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SurveyPortalAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())