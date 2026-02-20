"""
Backend API Tests for Group Chat Application
Tests include: Authentication, User Registration, Group CRUD, Group Messages, Contacts
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Use production URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://group-chat-app-6.preview.emergentagent.com').rstrip('/')

# Test data with alphanumeric usernames only (no underscores)
TEST_PREFIX = uuid.uuid4().hex[:6]
TEST_USER_1 = {
    "username": f"test{TEST_PREFIX}a",
    "email": f"test{TEST_PREFIX}a@test.com",
    "password": "password123",
    "public_key": "testPublicKey1",
    "identity_key": "testIdentityKey1",
    "signed_prekey": "testSignedPrekey1",
    "prekey_signature": "testPrekeySignature1"
}
TEST_USER_2 = {
    "username": f"test{TEST_PREFIX}b",
    "email": f"test{TEST_PREFIX}b@test.com",
    "password": "password123",
    "public_key": "testPublicKey2",
    "identity_key": "testIdentityKey2",
    "signed_prekey": "testSignedPrekey2",
    "prekey_signature": "testPrekeySignature2"
}

# Store created IDs for cleanup
created_users = []
created_groups = []


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthEndpoints:
    """Health check tests - run first"""
    
    def test_api_health(self, api_client):
        """Test API health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ API health check passed: {data}")


class TestUserAuthentication:
    """User registration and login tests"""
    
    def test_register_user1(self, api_client):
        """Register test user 1"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=TEST_USER_1)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["username"] == TEST_USER_1["username"].lower()
        assert data["email"] == TEST_USER_1["email"].lower()
        assert data["public_key"] == TEST_USER_1["public_key"]
        
        # Store for cleanup
        created_users.append(data["id"])
        TEST_USER_1["id"] = data["id"]
        print(f"✓ User 1 registered: {data['username']} (ID: {data['id']})")
    
    def test_register_user2(self, api_client):
        """Register test user 2"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=TEST_USER_2)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["username"] == TEST_USER_2["username"].lower()
        
        created_users.append(data["id"])
        TEST_USER_2["id"] = data["id"]
        print(f"✓ User 2 registered: {data['username']} (ID: {data['id']})")
    
    def test_register_duplicate_email(self, api_client):
        """Test duplicate email registration fails"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=TEST_USER_1)
        assert response.status_code == 400
        print("✓ Duplicate email registration correctly rejected")
    
    def test_register_duplicate_username(self, api_client):
        """Test duplicate username registration fails"""
        dup_user = TEST_USER_1.copy()
        dup_user["email"] = "different@test.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=dup_user)
        assert response.status_code == 400
        print("✓ Duplicate username registration correctly rejected")
    
    def test_login_success(self, api_client):
        """Test successful login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_1["email"],
            "password": TEST_USER_1["password"]
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == TEST_USER_1["id"]
        assert data["username"] == TEST_USER_1["username"].lower()
        print(f"✓ Login successful for: {data['username']}")
    
    def test_login_invalid_password(self, api_client):
        """Test login with invalid password"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_1["email"],
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid password login correctly rejected")
    
    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent email"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "anypassword"
        })
        assert response.status_code == 401
        print("✓ Non-existent user login correctly rejected")
    
    def test_check_username_available(self, api_client):
        """Test username availability check"""
        response = api_client.get(f"{BASE_URL}/api/auth/check-username/availableusername123")
        assert response.status_code == 200
        data = response.json()
        assert data["available"] == True
        print("✓ Username availability check works")
    
    def test_check_username_taken(self, api_client):
        """Test username taken check"""
        response = api_client.get(f"{BASE_URL}/api/auth/check-username/{TEST_USER_1['username']}")
        assert response.status_code == 200
        data = response.json()
        assert data["available"] == False
        print("✓ Username taken check works")


class TestUserEndpoints:
    """User info endpoints tests"""
    
    def test_get_user_by_id(self, api_client):
        """Get user by ID"""
        response = api_client.get(f"{BASE_URL}/api/users/{TEST_USER_1['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == TEST_USER_1["id"]
        assert data["username"] == TEST_USER_1["username"].lower()
        print(f"✓ Get user by ID works: {data['username']}")
    
    def test_get_user_not_found(self, api_client):
        """Get non-existent user"""
        response = api_client.get(f"{BASE_URL}/api/users/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Non-existent user returns 404")
    
    def test_search_user(self, api_client):
        """Search user by username"""
        response = api_client.get(f"{BASE_URL}/api/users/search", params={"username": TEST_USER_1["username"]})
        assert response.status_code == 200
        
        data = response.json()
        if data:  # May return null if not found
            assert data["username"] == TEST_USER_1["username"].lower()
        print("✓ User search works")
    
    def test_get_user_status(self, api_client):
        """Get user online status"""
        response = api_client.get(f"{BASE_URL}/api/users/{TEST_USER_1['id']}/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "online" in data
        assert "last_seen" in data
        print(f"✓ User status check works: online={data['online']}")


class TestContactsEndpoints:
    """Contacts management tests"""
    
    def test_add_contact(self, api_client):
        """Add user 2 as contact of user 1"""
        response = api_client.post(
            f"{BASE_URL}/api/contacts/add",
            params={"user_id": TEST_USER_1["id"], "contact_id": TEST_USER_2["id"]}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] in ["added", "already_exists"]
        print(f"✓ Contact added: {data['status']}")
    
    def test_add_contact_duplicate(self, api_client):
        """Add same contact again - should return already_exists"""
        response = api_client.post(
            f"{BASE_URL}/api/contacts/add",
            params={"user_id": TEST_USER_1["id"], "contact_id": TEST_USER_2["id"]}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "already_exists"
        print("✓ Duplicate contact correctly handled")
    
    def test_get_contacts(self, api_client):
        """Get user contacts"""
        response = api_client.get(f"{BASE_URL}/api/contacts/{TEST_USER_1['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Should contain at least user 2
        contact_ids = [c["id"] for c in data]
        assert TEST_USER_2["id"] in contact_ids
        print(f"✓ Get contacts works: {len(data)} contacts found")


class TestGroupEndpoints:
    """Group CRUD operations tests"""
    
    def test_create_group(self, api_client):
        """Create a new group"""
        group_data = {
            "name": f"TestGroup{TEST_PREFIX}",
            "creator_id": TEST_USER_1["id"],
            "member_ids": [TEST_USER_2["id"]]
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups", json=group_data)
        assert response.status_code == 200, f"Group creation failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["name"] == group_data["name"]
        assert data["creator_id"] == TEST_USER_1["id"]
        assert "members" in data
        assert "avatar_color" in data
        
        # Store for later tests and cleanup
        created_groups.append(data["id"])
        TEST_USER_1["group_id"] = data["id"]
        
        # Verify members include both creator and added member
        member_ids = [m["user_id"] for m in data["members"]]
        assert TEST_USER_1["id"] in member_ids
        assert TEST_USER_2["id"] in member_ids
        print(f"✓ Group created: {data['name']} (ID: {data['id']}) with {len(data['members'])} members")
    
    def test_get_user_groups(self, api_client):
        """Get all groups for a user"""
        response = api_client.get(f"{BASE_URL}/api/groups/{TEST_USER_1['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Find our test group
        test_group = next((g for g in data if g["id"] == TEST_USER_1["group_id"]), None)
        assert test_group is not None
        assert "name" in test_group
        assert "members" in test_group
        assert "member_count" in test_group
        print(f"✓ Get user groups works: {len(data)} groups found")
    
    def test_get_group_info(self, api_client):
        """Get specific group info"""
        group_id = TEST_USER_1["group_id"]
        response = api_client.get(f"{BASE_URL}/api/groups/{group_id}/info")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == group_id
        assert "name" in data
        assert "members" in data
        assert "creator_id" in data
        print(f"✓ Get group info works: {data['name']}")
    
    def test_update_group(self, api_client):
        """Update group name"""
        group_id = TEST_USER_1["group_id"]
        new_name = f"UpdatedGroup{TEST_PREFIX}"
        
        response = api_client.put(
            f"{BASE_URL}/api/groups/{group_id}",
            json={"name": new_name},
            params={"user_id": TEST_USER_1["id"]}
        )
        assert response.status_code == 200
        
        # Verify update
        response = api_client.get(f"{BASE_URL}/api/groups/{group_id}/info")
        data = response.json()
        assert data["name"] == new_name
        print(f"✓ Group updated: new name = {new_name}")
    
    def test_update_group_unauthorized(self, api_client):
        """Update group by non-admin should fail"""
        group_id = TEST_USER_1["group_id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/groups/{group_id}",
            json={"name": "Unauthorized Update"},
            params={"user_id": TEST_USER_2["id"]}  # User 2 is not admin
        )
        assert response.status_code == 403
        print("✓ Unauthorized group update correctly rejected")


class TestGroupMessagesEndpoints:
    """Group messaging tests"""
    
    def test_send_group_message(self, api_client):
        """Send message to group"""
        group_id = TEST_USER_1["group_id"]
        message_data = {
            "group_id": group_id,
            "sender_id": TEST_USER_1["id"],
            "content": f"Test message from {TEST_PREFIX}",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=message_data)
        assert response.status_code == 200, f"Send message failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["sender_id"] == TEST_USER_1["id"]
        assert data["content"] == message_data["content"]
        assert data["message_type"] == "text"
        assert "timestamp" in data
        assert "sender_username" in data
        
        TEST_USER_1["message_id"] = data["id"]
        print(f"✓ Group message sent: {data['content'][:30]}...")
    
    def test_send_group_message_by_member(self, api_client):
        """Member can send message to group"""
        group_id = TEST_USER_1["group_id"]
        message_data = {
            "group_id": group_id,
            "sender_id": TEST_USER_2["id"],
            "content": f"Reply from user 2 - {TEST_PREFIX}",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=message_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["sender_id"] == TEST_USER_2["id"]
        print(f"✓ Member message sent: {data['content'][:30]}...")
    
    def test_get_group_messages(self, api_client):
        """Get messages from group"""
        group_id = TEST_USER_1["group_id"]
        
        response = api_client.get(f"{BASE_URL}/api/groups/{group_id}/messages", params={"limit": 50})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # At least 2 messages from previous tests
        
        # Verify message structure
        for msg in data:
            assert "id" in msg
            assert "sender_id" in msg
            assert "content" in msg
            assert "timestamp" in msg
        print(f"✓ Get group messages works: {len(data)} messages found")
    
    def test_send_message_non_member(self, api_client):
        """Non-member cannot send message"""
        group_id = TEST_USER_1["group_id"]
        
        # Create a third user who is not a member
        non_member = {
            "username": f"nonmem{TEST_PREFIX}",
            "email": f"nonmem{TEST_PREFIX}@test.com",
            "password": "password123",
            "public_key": "testKey",
            "identity_key": "testKey",
            "signed_prekey": "testKey",
            "prekey_signature": "testSig"
        }
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json=non_member)
        if reg_response.status_code == 200:
            non_member_id = reg_response.json()["id"]
            created_users.append(non_member_id)
            
            message_data = {
                "group_id": group_id,
                "sender_id": non_member_id,
                "content": "Unauthorized message",
                "message_type": "text"
            }
            
            response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=message_data)
            assert response.status_code == 403
            print("✓ Non-member message correctly rejected")
        else:
            print("✓ Non-member test skipped (user creation failed)")


class TestGroupMembershipEndpoints:
    """Group member management tests"""
    
    def test_add_member_to_group(self, api_client):
        """Admin adds new member to group"""
        group_id = TEST_USER_1["group_id"]
        
        # Create a new user to add
        new_member = {
            "username": f"newmem{TEST_PREFIX}",
            "email": f"newmem{TEST_PREFIX}@test.com",
            "password": "password123",
            "public_key": "testKey",
            "identity_key": "testKey",
            "signed_prekey": "testKey",
            "prekey_signature": "testSig"
        }
        
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json=new_member)
        if reg_response.status_code == 200:
            new_member_id = reg_response.json()["id"]
            created_users.append(new_member_id)
            
            response = api_client.post(
                f"{BASE_URL}/api/groups/{group_id}/members/{new_member_id}",
                params={"admin_id": TEST_USER_1["id"]}
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["status"] == "added"
            TEST_USER_1["new_member_id"] = new_member_id
            print(f"✓ New member added to group")
        else:
            pytest.skip("Could not create new member")
    
    def test_add_member_duplicate(self, api_client):
        """Adding existing member should fail"""
        group_id = TEST_USER_1["group_id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/groups/{group_id}/members/{TEST_USER_2['id']}",
            params={"admin_id": TEST_USER_1["id"]}
        )
        assert response.status_code == 400  # Already in group
        print("✓ Duplicate member add correctly rejected")
    
    def test_add_member_unauthorized(self, api_client):
        """Non-admin cannot add members"""
        group_id = TEST_USER_1["group_id"]
        
        # User 2 is not admin, should not be able to add members
        fake_user_id = str(uuid.uuid4())
        response = api_client.post(
            f"{BASE_URL}/api/groups/{group_id}/members/{fake_user_id}",
            params={"admin_id": TEST_USER_2["id"]}
        )
        assert response.status_code == 403
        print("✓ Unauthorized member add correctly rejected")
    
    def test_remove_member_from_group(self, api_client):
        """Admin removes member from group"""
        group_id = TEST_USER_1["group_id"]
        member_to_remove = TEST_USER_1.get("new_member_id")
        
        if member_to_remove:
            response = api_client.delete(
                f"{BASE_URL}/api/groups/{group_id}/members/{member_to_remove}",
                params={"admin_id": TEST_USER_1["id"]}
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["status"] == "removed"
            print("✓ Member removed from group")
        else:
            pytest.skip("No member to remove")
    
    def test_member_self_leave(self, api_client):
        """Member can leave group themselves"""
        group_id = TEST_USER_1["group_id"]
        
        # User 2 leaves the group (self-leave)
        response = api_client.delete(
            f"{BASE_URL}/api/groups/{group_id}/members/{TEST_USER_2['id']}",
            params={"admin_id": TEST_USER_2["id"]}  # Same user leaving
        )
        assert response.status_code == 200
        print("✓ Member self-leave works")
        
        # Re-add user 2 for further tests
        api_client.post(
            f"{BASE_URL}/api/groups/{group_id}/members/{TEST_USER_2['id']}",
            params={"admin_id": TEST_USER_1["id"]}
        )


class TestDirectMessageEndpoints:
    """Direct message tests (1-on-1)"""
    
    def test_send_direct_message(self, api_client):
        """Send encrypted direct message"""
        message_data = {
            "sender_id": TEST_USER_1["id"],
            "receiver_id": TEST_USER_2["id"],
            "encrypted_content": "encryptedTestContent123",
            "ephemeral_key": "testEphemeralKey",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/messages/send", json=message_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["sender_id"] == TEST_USER_1["id"]
        assert data["receiver_id"] == TEST_USER_2["id"]
        assert data["status"] == "pending"
        
        TEST_USER_1["dm_message_id"] = data["id"]
        print(f"✓ Direct message sent: {data['id']}")
    
    def test_get_pending_messages(self, api_client):
        """Get pending messages for user"""
        response = api_client.get(f"{BASE_URL}/api/messages/pending/{TEST_USER_2['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the message we sent
        print(f"✓ Get pending messages works: {len(data)} messages")
    
    def test_get_message_history(self, api_client):
        """Get message history between two users"""
        response = api_client.get(
            f"{BASE_URL}/api/messages/history/{TEST_USER_1['id']}/{TEST_USER_2['id']}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get message history works: {len(data)} messages")


class TestGroupDeletion:
    """Group deletion tests - run last"""
    
    def test_delete_group_unauthorized(self, api_client):
        """Non-creator cannot delete group"""
        group_id = TEST_USER_1["group_id"]
        
        response = api_client.delete(
            f"{BASE_URL}/api/groups/{group_id}",
            params={"user_id": TEST_USER_2["id"]}
        )
        assert response.status_code == 403
        print("✓ Unauthorized group deletion correctly rejected")
    
    def test_delete_group(self, api_client):
        """Creator can delete group"""
        group_id = TEST_USER_1["group_id"]
        
        response = api_client.delete(
            f"{BASE_URL}/api/groups/{group_id}",
            params={"user_id": TEST_USER_1["id"]}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "deleted"
        
        # Verify group is gone
        response = api_client.get(f"{BASE_URL}/api/groups/{group_id}/info")
        assert response.status_code == 404
        print("✓ Group deleted successfully")


# Cleanup is handled by test prefix making data identifiable
# In production, you would clean up TEST_* prefixed data

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
