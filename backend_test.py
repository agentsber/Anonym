#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Secure Messenger
Tests all authentication, user, message, and contact endpoints
"""

import requests
import json
import uuid
from datetime import datetime
import base64

# Backend URL from environment
BACKEND_URL = "https://secure-messenger-149.preview.emergentagent.com/api"

class SecureMessengerTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_users = {}
        self.test_messages = {}
        self.results = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_test(self, test_name, success, message=""):
        """Log test results"""
        self.results["total_tests"] += 1
        if success:
            self.results["passed"] += 1
            print(f"✅ {test_name}: PASSED")
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")
        
        if message and success:
            print(f"   {message}")
    
    def generate_test_keys(self):
        """Generate mock keys for testing"""
        return {
            "public_key": base64.b64encode(b"mock_public_key_32_bytes_long__").decode(),
            "identity_key": base64.b64encode(b"mock_identity_key_32_bytes_long").decode(),
            "signed_prekey": base64.b64encode(b"mock_signed_prekey_32_bytes_lon").decode(),
            "prekey_signature": base64.b64encode(b"mock_signature_64_bytes_long_for_testing_purposes_here_ok").decode()
        }
    
    def test_health_check(self):
        """Test API health endpoints"""
        print("\n=== Health Check Tests ===")
        
        # Test root endpoint
        try:
            response = self.session.get(f"{BACKEND_URL}/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Root endpoint", True, f"Status: {data.get('status')}")
            else:
                self.log_test("Root endpoint", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Root endpoint", False, f"Exception: {str(e)}")
        
        # Test health endpoint
        try:
            response = self.session.get(f"{BACKEND_URL}/health")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Health endpoint", True, f"Status: {data.get('status')}")
            else:
                self.log_test("Health endpoint", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Health endpoint", False, f"Exception: {str(e)}")
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        print("\n=== User Registration Tests ===")
        
        # Test valid registration
        test_username = f"testuser{uuid.uuid4().hex[:8]}"
        keys = self.generate_test_keys()
        
        registration_data = {
            "username": test_username,
            **keys
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/register",
                json=registration_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                user_data = response.json()
                self.test_users[test_username] = user_data
                self.log_test("Valid user registration", True, f"User ID: {user_data['id']}")
            else:
                self.log_test("Valid user registration", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Valid user registration", False, f"Exception: {str(e)}")
        
        # Test duplicate username
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/register",
                json=registration_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 400:
                self.log_test("Duplicate username rejection", True, "Correctly rejected duplicate")
            else:
                self.log_test("Duplicate username rejection", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Duplicate username rejection", False, f"Exception: {str(e)}")
        
        # Test invalid username (too short)
        try:
            invalid_data = registration_data.copy()
            invalid_data["username"] = "ab"
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/register",
                json=invalid_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 400:
                self.log_test("Invalid username (too short)", True, "Correctly rejected short username")
            else:
                self.log_test("Invalid username (too short)", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Invalid username (too short)", False, f"Exception: {str(e)}")
        
        # Test invalid username (non-alphanumeric)
        try:
            invalid_data = registration_data.copy()
            invalid_data["username"] = "test@user"
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/register",
                json=invalid_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 400:
                self.log_test("Invalid username (non-alphanumeric)", True, "Correctly rejected non-alphanumeric username")
            else:
                self.log_test("Invalid username (non-alphanumeric)", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Invalid username (non-alphanumeric)", False, f"Exception: {str(e)}")
    
    def test_username_check(self):
        """Test username availability check"""
        print("\n=== Username Check Tests ===")
        
        # Test existing username
        if self.test_users:
            existing_username = list(self.test_users.keys())[0]
            try:
                response = self.session.get(f"{BACKEND_URL}/auth/check-username/{existing_username}")
                
                if response.status_code == 200:
                    data = response.json()
                    if not data.get("available"):
                        self.log_test("Existing username check", True, "Correctly shows as unavailable")
                    else:
                        self.log_test("Existing username check", False, "Should show as unavailable")
                else:
                    self.log_test("Existing username check", False, f"Status code: {response.status_code}")
            except Exception as e:
                self.log_test("Existing username check", False, f"Exception: {str(e)}")
        
        # Test new username
        new_username = f"newuser{uuid.uuid4().hex[:8]}"
        try:
            response = self.session.get(f"{BACKEND_URL}/auth/check-username/{new_username}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("available"):
                    self.log_test("New username check", True, "Correctly shows as available")
                else:
                    self.log_test("New username check", False, "Should show as available")
            else:
                self.log_test("New username check", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("New username check", False, f"Exception: {str(e)}")
    
    def test_user_login(self):
        """Test user login endpoint"""
        print("\n=== User Login Tests ===")
        
        # Test existing user login
        if self.test_users:
            username = list(self.test_users.keys())[0]
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/auth/login",
                    json={"username": username},
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    user_data = response.json()
                    if user_data["username"] == username:
                        self.log_test("Existing user login", True, f"User: {user_data['username']}")
                    else:
                        self.log_test("Existing user login", False, "Username mismatch in response")
                else:
                    self.log_test("Existing user login", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test("Existing user login", False, f"Exception: {str(e)}")
        
        # Test non-existent user login
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json={"username": "nonexistentuser123"},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 404:
                self.log_test("Non-existent user login", True, "Correctly returned 404")
            else:
                self.log_test("Non-existent user login", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_test("Non-existent user login", False, f"Exception: {str(e)}")
    
    def test_user_search(self):
        """Test user search endpoint"""
        print("\n=== User Search Tests ===")
        
        # Test existing user search
        if self.test_users:
            username = list(self.test_users.keys())[0]
            try:
                response = self.session.get(f"{BACKEND_URL}/users/search?username={username}")
                
                if response.status_code == 200:
                    user_data = response.json()
                    if user_data and user_data["username"] == username:
                        self.log_test("Existing user search", True, f"Found user: {user_data['username']}")
                    else:
                        self.log_test("Existing user search", False, "User not found or username mismatch")
                else:
                    self.log_test("Existing user search", False, f"Status code: {response.status_code}")
            except Exception as e:
                self.log_test("Existing user search", False, f"Exception: {str(e)}")
        
        # Test non-existent user search
        try:
            response = self.session.get(f"{BACKEND_URL}/users/search?username=nonexistentuser123")
            
            if response.status_code == 200:
                user_data = response.json()
                if user_data is None:
                    self.log_test("Non-existent user search", True, "Correctly returned null")
                else:
                    self.log_test("Non-existent user search", False, "Should return null for non-existent user")
            else:
                self.log_test("Non-existent user search", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Non-existent user search", False, f"Exception: {str(e)}")
    
    def test_messaging(self):
        """Test message sending and retrieval"""
        print("\n=== Messaging Tests ===")
        
        # Create two test users for messaging
        sender_username = f"sender{uuid.uuid4().hex[:8]}"
        receiver_username = f"receiver{uuid.uuid4().hex[:8]}"
        
        for username in [sender_username, receiver_username]:
            keys = self.generate_test_keys()
            registration_data = {"username": username, **keys}
            
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/auth/register",
                    json=registration_data,
                    headers={"Content-Type": "application/json"}
                )
                if response.status_code == 200:
                    self.test_users[username] = response.json()
            except Exception as e:
                print(f"Failed to create test user {username}: {str(e)}")
        
        if len([u for u in self.test_users.keys() if u.startswith(('sender', 'receiver'))]) >= 2:
            sender = self.test_users[sender_username]
            receiver = self.test_users[receiver_username]
            
            # Test valid message sending
            message_data = {
                "sender_id": sender["id"],
                "receiver_id": receiver["id"],
                "encrypted_content": base64.b64encode(b"Hello, this is an encrypted test message!").decode(),
                "ephemeral_key": base64.b64encode(b"mock_ephemeral_key_32_bytes_lon").decode(),
                "message_type": "text"
            }
            
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/messages/send",
                    json=message_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    msg_response = response.json()
                    self.test_messages[msg_response["id"]] = msg_response
                    self.log_test("Valid message sending", True, f"Message ID: {msg_response['id']}")
                else:
                    self.log_test("Valid message sending", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test("Valid message sending", False, f"Exception: {str(e)}")
            
            # Test message with invalid sender
            invalid_message = message_data.copy()
            invalid_message["sender_id"] = "invalid_user_id"
            
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/messages/send",
                    json=invalid_message,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 404:
                    self.log_test("Invalid sender message", True, "Correctly rejected invalid sender")
                else:
                    self.log_test("Invalid sender message", False, f"Expected 404, got {response.status_code}")
            except Exception as e:
                self.log_test("Invalid sender message", False, f"Exception: {str(e)}")
            
            # Test message with invalid receiver
            invalid_message = message_data.copy()
            invalid_message["receiver_id"] = "invalid_user_id"
            
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/messages/send",
                    json=invalid_message,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 404:
                    self.log_test("Invalid receiver message", True, "Correctly rejected invalid receiver")
                else:
                    self.log_test("Invalid receiver message", False, f"Expected 404, got {response.status_code}")
            except Exception as e:
                self.log_test("Invalid receiver message", False, f"Exception: {str(e)}")
    
    def test_pending_messages(self):
        """Test pending messages retrieval"""
        print("\n=== Pending Messages Tests ===")
        
        # Find receiver from our test users
        receiver_users = [u for username, u in self.test_users.items() if username.startswith('receiver')]
        
        if receiver_users:
            receiver = receiver_users[0]
            
            try:
                response = self.session.get(f"{BACKEND_URL}/messages/pending/{receiver['id']}")
                
                if response.status_code == 200:
                    messages = response.json()
                    if isinstance(messages, list):
                        self.log_test("Pending messages retrieval", True, f"Found {len(messages)} pending messages")
                    else:
                        self.log_test("Pending messages retrieval", False, "Response is not a list")
                else:
                    self.log_test("Pending messages retrieval", False, f"Status code: {response.status_code}")
            except Exception as e:
                self.log_test("Pending messages retrieval", False, f"Exception: {str(e)}")
    
    def test_message_delivery(self):
        """Test message delivery marking"""
        print("\n=== Message Delivery Tests ===")
        
        # Test with valid message ID
        if self.test_messages:
            message_id = list(self.test_messages.keys())[0]
            
            try:
                response = self.session.post(f"{BACKEND_URL}/messages/{message_id}/delivered")
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "delivered":
                        self.log_test("Valid message delivery", True, f"Message {message_id} marked as delivered")
                    else:
                        self.log_test("Valid message delivery", False, "Unexpected response format")
                else:
                    self.log_test("Valid message delivery", False, f"Status code: {response.status_code}")
            except Exception as e:
                self.log_test("Valid message delivery", False, f"Exception: {str(e)}")
        
        # Test with invalid message ID
        try:
            response = self.session.post(f"{BACKEND_URL}/messages/invalid_message_id/delivered")
            
            if response.status_code == 404:
                self.log_test("Invalid message delivery", True, "Correctly returned 404 for invalid message")
            else:
                self.log_test("Invalid message delivery", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_test("Invalid message delivery", False, f"Exception: {str(e)}")
    
    def test_contacts(self):
        """Test contacts management"""
        print("\n=== Contacts Management Tests ===")
        
        # Get two users for contact testing
        user_list = list(self.test_users.values())
        if len(user_list) >= 2:
            user1, user2 = user_list[0], user_list[1]
            
            # Test adding contact
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/contacts/add?user_id={user1['id']}&contact_id={user2['id']}"
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") in ["added", "already_exists"]:
                        self.log_test("Add contact", True, f"Status: {data['status']}")
                    else:
                        self.log_test("Add contact", False, f"Unexpected status: {data.get('status')}")
                else:
                    self.log_test("Add contact", False, f"Status code: {response.status_code}")
            except Exception as e:
                self.log_test("Add contact", False, f"Exception: {str(e)}")
            
            # Test getting contacts
            try:
                response = self.session.get(f"{BACKEND_URL}/contacts/{user1['id']}")
                
                if response.status_code == 200:
                    contacts = response.json()
                    if isinstance(contacts, list):
                        self.log_test("Get contacts", True, f"Retrieved {len(contacts)} contacts")
                    else:
                        self.log_test("Get contacts", False, "Response is not a list")
                else:
                    self.log_test("Get contacts", False, f"Status code: {response.status_code}")
            except Exception as e:
                self.log_test("Get contacts", False, f"Exception: {str(e)}")
            
            # Test adding contact with invalid user
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/contacts/add?user_id=invalid_user&contact_id={user2['id']}"
                )
                
                if response.status_code == 404:
                    self.log_test("Add contact with invalid user", True, "Correctly returned 404")
                else:
                    self.log_test("Add contact with invalid user", False, f"Expected 404, got {response.status_code}")
            except Exception as e:
                self.log_test("Add contact with invalid user", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Secure Messenger Backend API Tests")
        print(f"📡 Testing against: {BACKEND_URL}")
        print("=" * 60)
        
        self.test_health_check()
        self.test_user_registration()
        self.test_username_check()
        self.test_user_login()
        self.test_user_search()
        self.test_messaging()
        self.test_pending_messages()
        self.test_message_delivery()
        self.test_contacts()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.results['passed'] / self.results['total_tests']) * 100 if self.results['total_tests'] > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Excellent! Backend API is working very well.")
        elif success_rate >= 70:
            print("👍 Good! Most features are working with some minor issues.")
        else:
            print("⚠️  Backend API needs attention - multiple issues found.")
        
        return self.results

if __name__ == "__main__":
    tester = SecureMessengerTester()
    results = tester.run_all_tests()