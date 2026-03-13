#!/usr/bin/env python3

import requests
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Optional

# Backend API URL from frontend env
BACKEND_URL = "https://secure-chat-app-92.preview.emergentagent.com/api"

class SecureMessengerTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_users = []
        self.test_messages = []
        self.results = []
    
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def create_test_user(self, username: str) -> Optional[Dict]:
        """Create a test user with realistic crypto keys"""
        try:
            # Generate realistic-looking base64 keys
            import base64
            import os
            
            public_key = base64.b64encode(os.urandom(32)).decode()
            identity_key = base64.b64encode(os.urandom(32)).decode()
            signed_prekey = base64.b64encode(os.urandom(32)).decode()
            prekey_signature = base64.b64encode(os.urandom(64)).decode()
            
            user_data = {
                "username": username,
                "public_key": public_key,
                "identity_key": identity_key,
                "signed_prekey": signed_prekey,
                "prekey_signature": prekey_signature
            }
            
            response = self.session.post(f"{BACKEND_URL}/auth/register", json=user_data)
            
            if response.status_code == 200:
                user = response.json()
                self.test_users.append(user)
                self.log_test(f"Create user '{username}'", True, f"User ID: {user['id']}")
                return user
            else:
                self.log_test(f"Create user '{username}'", False, f"Status: {response.status_code}, Error: {response.text}")
                return None
                
        except Exception as e:
            self.log_test(f"Create user '{username}'", False, f"Exception: {str(e)}")
            return None
    
    def test_message_read_api(self):
        """Test POST /api/messages/{message_id}/read"""
        if len(self.test_users) < 2:
            self.log_test("Mark Message Read API", False, "Need at least 2 users")
            return
        
        try:
            # First send a message
            sender = self.test_users[0]
            receiver = self.test_users[1]
            
            message_data = {
                "sender_id": sender["id"],
                "receiver_id": receiver["id"],
                "encrypted_content": base64.b64encode(b"Test message for read receipt").decode(),
                "ephemeral_key": base64.b64encode(os.urandom(32)).decode(),
                "message_type": "text"
            }
            
            send_response = self.session.post(f"{BACKEND_URL}/messages/send", json=message_data)
            if send_response.status_code != 200:
                self.log_test("Mark Message Read API", False, f"Failed to send test message: {send_response.text}")
                return
            
            message = send_response.json()
            message_id = message["id"]
            self.test_messages.append(message)
            
            # Test valid message read
            read_response = self.session.post(
                f"{BACKEND_URL}/messages/{message_id}/read",
                params={"reader_id": receiver["id"]}
            )
            
            if read_response.status_code == 200:
                result = read_response.json()
                if result.get("status") == "read" and result.get("message_id") == message_id:
                    self.log_test("Mark Message Read API (Valid)", True, f"Message {message_id} marked as read")
                else:
                    self.log_test("Mark Message Read API (Valid)", False, f"Unexpected response: {result}")
            else:
                self.log_test("Mark Message Read API (Valid)", False, f"Status: {read_response.status_code}, Error: {read_response.text}")
            
            # Test invalid message ID
            fake_id = str(uuid.uuid4())
            invalid_response = self.session.post(
                f"{BACKEND_URL}/messages/{fake_id}/read",
                params={"reader_id": receiver["id"]}
            )
            
            # Should still return success even for non-existent message (as per implementation)
            if invalid_response.status_code == 200:
                self.log_test("Mark Message Read API (Invalid ID)", True, "Correctly handles non-existent message")
            else:
                self.log_test("Mark Message Read API (Invalid ID)", False, f"Status: {invalid_response.status_code}")
                
        except Exception as e:
            self.log_test("Mark Message Read API", False, f"Exception: {str(e)}")
    
    def test_edit_message_api(self):
        """Test PUT /api/messages/{message_id}/edit"""
        if len(self.test_users) < 2:
            self.log_test("Edit Message API", False, "Need at least 2 users")
            return
        
        try:
            # Send a message first
            sender = self.test_users[0]
            receiver = self.test_users[1]
            
            message_data = {
                "sender_id": sender["id"],
                "receiver_id": receiver["id"],
                "encrypted_content": base64.b64encode(b"Original message content").decode(),
                "ephemeral_key": base64.b64encode(os.urandom(32)).decode(),
                "message_type": "text"
            }
            
            send_response = self.session.post(f"{BACKEND_URL}/messages/send", json=message_data)
            if send_response.status_code != 200:
                self.log_test("Edit Message API", False, f"Failed to send test message: {send_response.text}")
                return
            
            message = send_response.json()
            message_id = message["id"]
            
            # Test valid edit by sender
            edit_data = {
                "encrypted_content": base64.b64encode(b"Edited message content").decode(),
                "ephemeral_key": base64.b64encode(os.urandom(32)).decode()
            }
            
            edit_response = self.session.put(
                f"{BACKEND_URL}/messages/{message_id}/edit",
                params={"sender_id": sender["id"]},
                json=edit_data
            )
            
            if edit_response.status_code == 200:
                result = edit_response.json()
                if result.get("status") == "edited" and result.get("message_id") == message_id:
                    self.log_test("Edit Message API (Valid Sender)", True, f"Message {message_id} edited successfully")
                else:
                    self.log_test("Edit Message API (Valid Sender)", False, f"Unexpected response: {result}")
            else:
                self.log_test("Edit Message API (Valid Sender)", False, f"Status: {edit_response.status_code}, Error: {edit_response.text}")
            
            # Test invalid edit by non-sender
            unauthorized_response = self.session.put(
                f"{BACKEND_URL}/messages/{message_id}/edit",
                params={"sender_id": receiver["id"]},  # Wrong user
                json=edit_data
            )
            
            if unauthorized_response.status_code == 404:
                self.log_test("Edit Message API (Unauthorized)", True, "Correctly rejects unauthorized edit")
            else:
                self.log_test("Edit Message API (Unauthorized)", False, f"Status: {unauthorized_response.status_code}, should be 404")
                
        except Exception as e:
            self.log_test("Edit Message API", False, f"Exception: {str(e)}")
    
    def test_delete_message_api(self):
        """Test DELETE /api/messages/{message_id}"""
        if len(self.test_users) < 2:
            self.log_test("Delete Message API", False, "Need at least 2 users")
            return
        
        try:
            # Send a message first
            sender = self.test_users[0]
            receiver = self.test_users[1]
            
            message_data = {
                "sender_id": sender["id"],
                "receiver_id": receiver["id"],
                "encrypted_content": base64.b64encode(b"Message to be deleted").decode(),
                "ephemeral_key": base64.b64encode(os.urandom(32)).decode(),
                "message_type": "text"
            }
            
            send_response = self.session.post(f"{BACKEND_URL}/messages/send", json=message_data)
            if send_response.status_code != 200:
                self.log_test("Delete Message API", False, f"Failed to send test message: {send_response.text}")
                return
            
            message = send_response.json()
            message_id = message["id"]
            
            # Test delete for everyone by sender
            delete_response = self.session.delete(
                f"{BACKEND_URL}/messages/{message_id}",
                params={"sender_id": sender["id"], "for_everyone": "true"}
            )
            
            if delete_response.status_code == 200:
                result = delete_response.json()
                if result.get("status") == "deleted" and result.get("for_everyone") == True:
                    self.log_test("Delete Message API (For Everyone)", True, f"Message {message_id} deleted for everyone")
                else:
                    self.log_test("Delete Message API (For Everyone)", False, f"Unexpected response: {result}")
            else:
                self.log_test("Delete Message API (For Everyone)", False, f"Status: {delete_response.status_code}, Error: {delete_response.text}")
            
            # Send another message for unauthorized delete test
            send_response2 = self.session.post(f"{BACKEND_URL}/messages/send", json=message_data)
            if send_response2.status_code == 200:
                message2 = send_response2.json()
                message_id2 = message2["id"]
                
                # Test unauthorized delete by non-sender
                unauthorized_response = self.session.delete(
                    f"{BACKEND_URL}/messages/{message_id2}",
                    params={"sender_id": receiver["id"], "for_everyone": "true"}  # Wrong user
                )
                
                if unauthorized_response.status_code == 403:
                    self.log_test("Delete Message API (Unauthorized)", True, "Correctly rejects unauthorized delete")
                else:
                    self.log_test("Delete Message API (Unauthorized)", False, f"Status: {unauthorized_response.status_code}, should be 403")
                
        except Exception as e:
            self.log_test("Delete Message API", False, f"Exception: {str(e)}")
    
    def test_user_status_api(self):
        """Test GET /api/users/{user_id}/status"""
        if not self.test_users:
            self.log_test("Get User Status API", False, "Need at least 1 user")
            return
        
        try:
            user = self.test_users[0]
            user_id = user["id"]
            
            # Test valid user status
            status_response = self.session.get(f"{BACKEND_URL}/users/{user_id}/status")
            
            if status_response.status_code == 200:
                result = status_response.json()
                expected_keys = ["user_id", "online", "last_seen"]
                
                if all(key in result for key in expected_keys) and result["user_id"] == user_id:
                    self.log_test("Get User Status API (Valid)", True, f"Status: online={result['online']}, last_seen={result['last_seen']}")
                else:
                    self.log_test("Get User Status API (Valid)", False, f"Missing required fields: {result}")
            else:
                self.log_test("Get User Status API (Valid)", False, f"Status: {status_response.status_code}, Error: {status_response.text}")
            
            # Test invalid user ID
            fake_id = str(uuid.uuid4())
            invalid_response = self.session.get(f"{BACKEND_URL}/users/{fake_id}/status")
            
            # Should return status even for non-existent user (as per implementation)
            if invalid_response.status_code == 200:
                result = invalid_response.json()
                if result["user_id"] == fake_id and result["online"] == False:
                    self.log_test("Get User Status API (Invalid ID)", True, "Correctly handles non-existent user")
                else:
                    self.log_test("Get User Status API (Invalid ID)", False, f"Unexpected response: {result}")
            else:
                self.log_test("Get User Status API (Invalid ID)", False, f"Status: {invalid_response.status_code}")
                
        except Exception as e:
            self.log_test("Get User Status API", False, f"Exception: {str(e)}")
    
    def test_message_history_api(self):
        """Test GET /api/messages/history/{user_id}/{contact_id}"""
        if len(self.test_users) < 2:
            self.log_test("Message History API", False, "Need at least 2 users")
            return
        
        try:
            user1 = self.test_users[0]
            user2 = self.test_users[1]
            
            # Send a few messages between users
            messages_sent = []
            for i in range(3):
                message_data = {
                    "sender_id": user1["id"] if i % 2 == 0 else user2["id"],
                    "receiver_id": user2["id"] if i % 2 == 0 else user1["id"],
                    "encrypted_content": base64.b64encode(f"History message {i+1}".encode()).decode(),
                    "ephemeral_key": base64.b64encode(os.urandom(32)).decode(),
                    "message_type": "text"
                }
                
                send_response = self.session.post(f"{BACKEND_URL}/messages/send", json=message_data)
                if send_response.status_code == 200:
                    messages_sent.append(send_response.json())
                    time.sleep(0.1)  # Small delay to ensure timestamp ordering
            
            # Test getting history
            history_response = self.session.get(f"{BACKEND_URL}/messages/history/{user1['id']}/{user2['id']}")
            
            if history_response.status_code == 200:
                history = history_response.json()
                if isinstance(history, list) and len(history) >= len(messages_sent):
                    self.log_test("Message History API (Valid)", True, f"Retrieved {len(history)} messages")
                    
                    # Verify message structure
                    if history:
                        msg = history[0]
                        expected_keys = ["id", "sender_id", "receiver_id", "encrypted_content", "ephemeral_key", "message_type", "status", "timestamp"]
                        if all(key in msg for key in expected_keys):
                            self.log_test("Message History API (Structure)", True, "Messages have correct structure")
                        else:
                            self.log_test("Message History API (Structure)", False, f"Missing keys in message: {msg}")
                else:
                    self.log_test("Message History API (Valid)", False, f"Expected at least {len(messages_sent)} messages, got {len(history) if isinstance(history, list) else 'non-list'}")
            else:
                self.log_test("Message History API (Valid)", False, f"Status: {history_response.status_code}, Error: {history_response.text}")
            
            # Test with invalid user IDs
            fake_id = str(uuid.uuid4())
            invalid_response = self.session.get(f"{BACKEND_URL}/messages/history/{fake_id}/{user2['id']}")
            
            if invalid_response.status_code == 200:
                result = invalid_response.json()
                if isinstance(result, list) and len(result) == 0:
                    self.log_test("Message History API (Invalid User)", True, "Returns empty list for invalid user")
                else:
                    self.log_test("Message History API (Invalid User)", False, f"Unexpected response: {result}")
            else:
                self.log_test("Message History API (Invalid User)", False, f"Status: {invalid_response.status_code}")
                
        except Exception as e:
            self.log_test("Message History API", False, f"Exception: {str(e)}")
    
    def test_enhanced_send_message_api(self):
        """Test enhanced POST /api/messages/send with new parameters"""
        if len(self.test_users) < 2:
            self.log_test("Enhanced Send Message API", False, "Need at least 2 users")
            return
        
        try:
            sender = self.test_users[0]
            receiver = self.test_users[1]
            
            # Send a message first to reply to
            original_message = {
                "sender_id": sender["id"],
                "receiver_id": receiver["id"],
                "encrypted_content": base64.b64encode(b"Original message").decode(),
                "ephemeral_key": base64.b64encode(os.urandom(32)).decode(),
                "message_type": "text"
            }
            
            original_response = self.session.post(f"{BACKEND_URL}/messages/send", json=original_message)
            if original_response.status_code != 200:
                self.log_test("Enhanced Send Message API", False, f"Failed to send original message: {original_response.text}")
                return
            
            original = original_response.json()
            
            # Test enhanced message with reply_to_id and auto_delete_seconds
            enhanced_message = {
                "sender_id": receiver["id"],
                "receiver_id": sender["id"],
                "encrypted_content": base64.b64encode(b"Reply with auto-delete").decode(),
                "ephemeral_key": base64.b64encode(os.urandom(32)).decode(),
                "message_type": "text",
                "reply_to_id": original["id"],
                "auto_delete_seconds": 3600  # 1 hour
            }
            
            enhanced_response = self.session.post(f"{BACKEND_URL}/messages/send", json=enhanced_message)
            
            if enhanced_response.status_code == 200:
                result = enhanced_response.json()
                if (result.get("reply_to_id") == original["id"] and 
                    result.get("auto_delete_seconds") == 3600 and
                    result.get("expires_at") is not None):
                    self.log_test("Enhanced Send Message API (With Parameters)", True, f"Reply and auto-delete working: expires_at={result['expires_at']}")
                else:
                    self.log_test("Enhanced Send Message API (With Parameters)", False, f"Missing enhanced features: {result}")
            else:
                self.log_test("Enhanced Send Message API (With Parameters)", False, f"Status: {enhanced_response.status_code}, Error: {enhanced_response.text}")
            
            # Test message without enhanced parameters (backward compatibility)
            basic_message = {
                "sender_id": sender["id"],
                "receiver_id": receiver["id"],
                "encrypted_content": base64.b64encode(b"Basic message").decode(),
                "ephemeral_key": base64.b64encode(os.urandom(32)).decode(),
                "message_type": "text"
            }
            
            basic_response = self.session.post(f"{BACKEND_URL}/messages/send", json=basic_message)
            
            if basic_response.status_code == 200:
                result = basic_response.json()
                if (result.get("reply_to_id") is None and 
                    result.get("auto_delete_seconds") is None and
                    result.get("expires_at") is None):
                    self.log_test("Enhanced Send Message API (Backward Compatibility)", True, "Basic messages still work without new parameters")
                else:
                    self.log_test("Enhanced Send Message API (Backward Compatibility)", False, f"Unexpected values for optional fields: {result}")
            else:
                self.log_test("Enhanced Send Message API (Backward Compatibility)", False, f"Status: {basic_response.status_code}, Error: {basic_response.text}")
                
        except Exception as e:
            self.log_test("Enhanced Send Message API", False, f"Exception: {str(e)}")
    
    def test_existing_endpoints_still_work(self):
        """Test that existing endpoints still work correctly"""
        try:
            # Test user search
            if self.test_users:
                user = self.test_users[0]
                search_response = self.session.get(f"{BACKEND_URL}/users/search", params={"username": user["username"]})
                
                if search_response.status_code == 200:
                    result = search_response.json()
                    if result and result.get("id") == user["id"]:
                        self.log_test("Existing Endpoint: User Search", True, "User search working correctly")
                    else:
                        self.log_test("Existing Endpoint: User Search", False, f"Search returned wrong user: {result}")
                else:
                    self.log_test("Existing Endpoint: User Search", False, f"Status: {search_response.status_code}")
            
            # Test get pending messages
            if self.test_users:
                user = self.test_users[0]
                pending_response = self.session.get(f"{BACKEND_URL}/messages/pending/{user['id']}")
                
                if pending_response.status_code == 200:
                    result = pending_response.json()
                    if isinstance(result, list):
                        self.log_test("Existing Endpoint: Get Pending Messages", True, f"Retrieved {len(result)} pending messages")
                    else:
                        self.log_test("Existing Endpoint: Get Pending Messages", False, f"Expected list, got: {type(result)}")
                else:
                    self.log_test("Existing Endpoint: Get Pending Messages", False, f"Status: {pending_response.status_code}")
                    
        except Exception as e:
            self.log_test("Existing Endpoints", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run comprehensive backend API tests"""
        print("=== Secure Messenger Backend API Tests ===")
        print(f"Testing against: {BACKEND_URL}")
        print()
        
        # Health check first
        try:
            health_response = self.session.get(f"{BACKEND_URL}/health")
            if health_response.status_code == 200:
                self.log_test("Health Check", True, "Backend is running")
            else:
                self.log_test("Health Check", False, f"Status: {health_response.status_code}")
                return
        except Exception as e:
            self.log_test("Health Check", False, f"Cannot reach backend: {str(e)}")
            return
        
        # Create test users
        alice = self.create_test_user("alicetester")
        bob = self.create_test_user("bobtester")
        charlie = self.create_test_user("charlietester")
        
        if len(self.test_users) < 2:
            print("❌ Cannot proceed with testing - failed to create required test users")
            return
        
        print("\n=== Testing NEW Endpoints ===")
        
        # Test new endpoints
        self.test_message_read_api()
        self.test_edit_message_api()
        self.test_delete_message_api()
        self.test_user_status_api()
        self.test_message_history_api()
        self.test_enhanced_send_message_api()
        
        print("\n=== Testing Existing Endpoints (Regression) ===")
        
        # Test existing endpoints still work
        self.test_existing_endpoints_still_work()
        
        # Print summary
        print("\n=== Test Summary ===")
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"Tests passed: {passed}/{total} ({success_rate:.1f}%)")
        
        if passed < total:
            print("\n❌ Failed Tests:")
            for result in self.results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return success_rate >= 90  # Consider 90%+ as success

if __name__ == "__main__":
    import base64
    import os
    
    tester = SecureMessengerTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Backend API testing completed successfully!")
    else:
        print("\n⚠️ Backend API testing completed with issues.")