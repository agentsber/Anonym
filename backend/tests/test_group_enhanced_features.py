"""
Backend API Tests for Enhanced Group Chat Features
Tests: Edit/Delete messages, Pin/Unpin, Search, Role management (multiple admins), Ban/Unban members
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Use production URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cryptochat-dev.preview.emergentagent.com').rstrip('/')

# Use existing test users for faster testing
EXISTING_USER_1 = {
    "id": "4605daa0-76f9-4d52-aa7a-02a4fd39271c",
    "email": "test1@test.com",
    "password": "password123"
}
EXISTING_USER_2 = {
    "id": "83a6469b-2210-4a27-a29c-2569ba6a8d81", 
    "email": "test2@test.com",
    "password": "password123"
}
EXISTING_GROUP_ID = "11802a1c-2c1b-4f10-83e7-073abf15245b"

# Test data for new test group
TEST_PREFIX = uuid.uuid4().hex[:6]
created_message_ids = []
created_group_id = None


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def test_group(api_client):
    """Create a test group for enhanced feature testing"""
    global created_group_id
    
    # Login first user to verify credentials
    login_resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": EXISTING_USER_1["email"],
        "password": EXISTING_USER_1["password"]
    })
    if login_resp.status_code != 200:
        pytest.skip("Could not login with test user 1")
    
    # Create a new group for testing
    group_data = {
        "name": f"EnhancedTestGroup{TEST_PREFIX}",
        "creator_id": EXISTING_USER_1["id"],
        "member_ids": [EXISTING_USER_2["id"]]
    }
    
    response = api_client.post(f"{BASE_URL}/api/groups", json=group_data)
    if response.status_code != 200:
        # Use existing group as fallback
        created_group_id = EXISTING_GROUP_ID
        return {"id": EXISTING_GROUP_ID}
    
    data = response.json()
    created_group_id = data["id"]
    return data


class TestHealthCheck:
    """Verify API is running"""
    
    def test_api_health(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ API is healthy")


class TestGroupMessageEditing:
    """Test editing group messages"""
    
    def test_send_message_then_edit(self, api_client, test_group):
        """Send a message and edit it"""
        group_id = test_group["id"]
        
        # Send a message
        message_data = {
            "group_id": group_id,
            "sender_id": EXISTING_USER_1["id"],
            "content": f"Original message {TEST_PREFIX}",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=message_data)
        assert response.status_code == 200, f"Send message failed: {response.text}"
        
        message = response.json()
        message_id = message["id"]
        created_message_ids.append(message_id)
        print(f"✓ Message sent: {message_id}")
        
        # Edit the message
        edit_data = {"content": f"Edited message {TEST_PREFIX}"}
        response = api_client.put(
            f"{BASE_URL}/api/groups/{group_id}/messages/{message_id}",
            json=edit_data,
            params={"user_id": EXISTING_USER_1["id"]}
        )
        assert response.status_code == 200, f"Edit message failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "edited"
        print(f"✓ Message edited successfully")
        
        # Verify message is edited (GET messages and check)
        response = api_client.get(f"{BASE_URL}/api/groups/{group_id}/messages", params={"limit": 50})
        assert response.status_code == 200
        
        messages = response.json()
        edited_msg = next((m for m in messages if m["id"] == message_id), None)
        assert edited_msg is not None
        assert edited_msg["content"] == f"Edited message {TEST_PREFIX}"
        assert edited_msg["is_edited"] == True
        print(f"✓ Edit verified in message list")
    
    def test_edit_message_unauthorized(self, api_client, test_group):
        """Non-sender cannot edit message"""
        group_id = test_group["id"]
        
        # Send a message as user 1
        message_data = {
            "group_id": group_id,
            "sender_id": EXISTING_USER_1["id"],
            "content": f"Message for unauthorized edit test {TEST_PREFIX}",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=message_data)
        assert response.status_code == 200
        message_id = response.json()["id"]
        created_message_ids.append(message_id)
        
        # Try to edit as user 2 - should fail
        edit_data = {"content": "Unauthorized edit attempt"}
        response = api_client.put(
            f"{BASE_URL}/api/groups/{group_id}/messages/{message_id}",
            json=edit_data,
            params={"user_id": EXISTING_USER_2["id"]}
        )
        assert response.status_code == 403
        print("✓ Unauthorized edit correctly rejected")


class TestGroupMessageDeletion:
    """Test deleting group messages"""
    
    def test_sender_can_delete_own_message(self, api_client, test_group):
        """Sender can delete their own message"""
        group_id = test_group["id"]
        
        # Send a message
        message_data = {
            "group_id": group_id,
            "sender_id": EXISTING_USER_1["id"],
            "content": f"Message to delete {TEST_PREFIX}",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=message_data)
        assert response.status_code == 200
        message_id = response.json()["id"]
        
        # Delete the message
        response = api_client.delete(
            f"{BASE_URL}/api/groups/{group_id}/messages/{message_id}",
            params={"user_id": EXISTING_USER_1["id"]}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "deleted"
        print("✓ Sender deleted own message successfully")
    
    def test_admin_can_delete_any_message(self, api_client, test_group):
        """Admin can delete any message"""
        group_id = test_group["id"]
        
        # User 2 sends a message
        message_data = {
            "group_id": group_id,
            "sender_id": EXISTING_USER_2["id"],
            "content": f"User 2 message for admin delete {TEST_PREFIX}",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=message_data)
        # User 2 might not be member of new group, handle gracefully
        if response.status_code == 403:
            pytest.skip("User 2 not member of test group")
        
        assert response.status_code == 200
        message_id = response.json()["id"]
        
        # Admin (user 1) deletes the message
        response = api_client.delete(
            f"{BASE_URL}/api/groups/{group_id}/messages/{message_id}",
            params={"user_id": EXISTING_USER_1["id"]}
        )
        assert response.status_code == 200
        print("✓ Admin deleted member's message successfully")
    
    def test_non_admin_cannot_delete_others_message(self, api_client, test_group):
        """Non-admin cannot delete other's message"""
        group_id = test_group["id"]
        
        # User 1 (admin) sends a message
        message_data = {
            "group_id": group_id,
            "sender_id": EXISTING_USER_1["id"],
            "content": f"Admin message that member cannot delete {TEST_PREFIX}",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=message_data)
        assert response.status_code == 200
        message_id = response.json()["id"]
        created_message_ids.append(message_id)
        
        # User 2 (non-admin) tries to delete - should fail
        response = api_client.delete(
            f"{BASE_URL}/api/groups/{group_id}/messages/{message_id}",
            params={"user_id": EXISTING_USER_2["id"]}
        )
        assert response.status_code == 403
        print("✓ Non-admin correctly cannot delete other's message")


class TestPinMessages:
    """Test pinning/unpinning messages"""
    
    def test_admin_can_pin_message(self, api_client, test_group):
        """Admin can pin a message"""
        group_id = test_group["id"]
        
        # Send a message to pin
        message_data = {
            "group_id": group_id,
            "sender_id": EXISTING_USER_1["id"],
            "content": f"Important announcement to pin {TEST_PREFIX}",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=message_data)
        assert response.status_code == 200
        message_id = response.json()["id"]
        created_message_ids.append(message_id)
        
        # Pin the message
        response = api_client.post(
            f"{BASE_URL}/api/groups/{group_id}/messages/{message_id}/pin",
            params={"user_id": EXISTING_USER_1["id"]}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "pinned"
        print(f"✓ Message pinned successfully: {message_id}")
        
        # Store for unpin test
        test_group["pinned_message_id"] = message_id
    
    def test_get_pinned_messages(self, api_client, test_group):
        """Get all pinned messages in group"""
        group_id = test_group["id"]
        
        response = api_client.get(f"{BASE_URL}/api/groups/{group_id}/pinned")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Should contain our pinned message
        pinned_ids = [m["id"] for m in data]
        if "pinned_message_id" in test_group:
            assert test_group["pinned_message_id"] in pinned_ids
        
        print(f"✓ Get pinned messages: {len(data)} pinned messages found")
    
    def test_admin_can_unpin_message(self, api_client, test_group):
        """Admin can unpin a message"""
        group_id = test_group["id"]
        
        if "pinned_message_id" not in test_group:
            pytest.skip("No pinned message to unpin")
        
        message_id = test_group["pinned_message_id"]
        
        response = api_client.delete(
            f"{BASE_URL}/api/groups/{group_id}/messages/{message_id}/pin",
            params={"user_id": EXISTING_USER_1["id"]}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "unpinned"
        print("✓ Message unpinned successfully")
    
    def test_non_admin_cannot_pin(self, api_client, test_group):
        """Non-admin cannot pin messages"""
        group_id = test_group["id"]
        
        # Get a message to try to pin
        response = api_client.get(f"{BASE_URL}/api/groups/{group_id}/messages", params={"limit": 1})
        if response.status_code != 200 or not response.json():
            pytest.skip("No messages to test pin")
        
        message_id = response.json()[0]["id"]
        
        # User 2 (non-admin) tries to pin - should fail
        response = api_client.post(
            f"{BASE_URL}/api/groups/{group_id}/messages/{message_id}/pin",
            params={"user_id": EXISTING_USER_2["id"]}
        )
        assert response.status_code == 403
        print("✓ Non-admin correctly cannot pin messages")


class TestSearchMessages:
    """Test message search functionality"""
    
    def test_search_messages_basic(self, api_client, test_group):
        """Search messages by keyword"""
        group_id = test_group["id"]
        
        # First send a message with searchable content
        unique_keyword = f"SEARCHABLE{TEST_PREFIX}"
        message_data = {
            "group_id": group_id,
            "sender_id": EXISTING_USER_1["id"],
            "content": f"This contains {unique_keyword} text for search test",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=message_data)
        assert response.status_code == 200
        message_id = response.json()["id"]
        created_message_ids.append(message_id)
        
        # Now search for it
        response = api_client.get(
            f"{BASE_URL}/api/groups/{group_id}/search",
            params={"q": unique_keyword}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify search result contains our message
        found_ids = [m["id"] for m in data]
        assert message_id in found_ids
        print(f"✓ Search found {len(data)} messages containing '{unique_keyword}'")
    
    def test_search_messages_short_query(self, api_client, test_group):
        """Search with too short query should fail"""
        group_id = test_group["id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/groups/{group_id}/search",
            params={"q": "a"}  # Only 1 character
        )
        assert response.status_code == 400
        print("✓ Short search query correctly rejected")
    
    def test_search_messages_no_results(self, api_client, test_group):
        """Search with no matching results"""
        group_id = test_group["id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/groups/{group_id}/search",
            params={"q": "xyznonexistent12345"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
        print("✓ Search with no results returns empty list")


class TestMemberRoleManagement:
    """Test multiple admins / role updates"""
    
    def test_update_member_to_admin(self, api_client, test_group):
        """Admin promotes member to admin"""
        group_id = test_group["id"]
        
        # Promote user 2 to admin
        response = api_client.put(
            f"{BASE_URL}/api/groups/{group_id}/members/{EXISTING_USER_2['id']}/role",
            json={"role": "admin"},
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        
        # User 2 might not be member, handle gracefully
        if response.status_code == 404:
            pytest.skip("User 2 not member of test group")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "updated"
        assert data["new_role"] == "admin"
        print("✓ Member promoted to admin")
    
    def test_demote_admin_to_member(self, api_client, test_group):
        """Admin demotes another admin to member"""
        group_id = test_group["id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/groups/{group_id}/members/{EXISTING_USER_2['id']}/role",
            json={"role": "member"},
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        
        if response.status_code == 404:
            pytest.skip("User 2 not member of test group")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "updated"
        assert data["new_role"] == "member"
        print("✓ Admin demoted to member")
    
    def test_cannot_change_creator_role(self, api_client, test_group):
        """Cannot change the creator's role"""
        group_id = test_group["id"]
        
        # First make user 2 admin
        api_client.put(
            f"{BASE_URL}/api/groups/{group_id}/members/{EXISTING_USER_2['id']}/role",
            json={"role": "admin"},
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        
        # User 2 (now admin) tries to demote creator
        response = api_client.put(
            f"{BASE_URL}/api/groups/{group_id}/members/{EXISTING_USER_1['id']}/role",
            json={"role": "member"},
            params={"admin_id": EXISTING_USER_2["id"]}
        )
        assert response.status_code == 400
        print("✓ Creator role change correctly blocked")
    
    def test_non_admin_cannot_change_roles(self, api_client, test_group):
        """Non-admin cannot change roles"""
        group_id = test_group["id"]
        
        # First ensure user 2 is member (not admin)
        api_client.put(
            f"{BASE_URL}/api/groups/{group_id}/members/{EXISTING_USER_2['id']}/role",
            json={"role": "member"},
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        
        # User 2 (member) tries to promote themselves
        response = api_client.put(
            f"{BASE_URL}/api/groups/{group_id}/members/{EXISTING_USER_2['id']}/role",
            json={"role": "admin"},
            params={"admin_id": EXISTING_USER_2["id"]}
        )
        assert response.status_code == 403
        print("✓ Non-admin role change correctly blocked")
    
    def test_invalid_role(self, api_client, test_group):
        """Invalid role should be rejected"""
        group_id = test_group["id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/groups/{group_id}/members/{EXISTING_USER_2['id']}/role",
            json={"role": "superadmin"},  # Invalid role
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        assert response.status_code == 400
        print("✓ Invalid role correctly rejected")


class TestBanManagement:
    """Test ban/unban functionality"""
    
    def test_admin_can_ban_member(self, api_client, test_group):
        """Admin can ban a member"""
        group_id = test_group["id"]
        
        # First ensure user 2 is member of the group
        # Re-add if needed
        api_client.post(
            f"{BASE_URL}/api/groups/{group_id}/members/{EXISTING_USER_2['id']}",
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        
        # Ban user 2
        response = api_client.post(
            f"{BASE_URL}/api/groups/{group_id}/ban/{EXISTING_USER_2['id']}",
            json={"reason": f"Test ban {TEST_PREFIX}"},
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        
        if response.status_code == 404:
            pytest.skip("User 2 not member of test group")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "banned"
        print("✓ Member banned successfully")
    
    def test_get_banned_members(self, api_client, test_group):
        """Get list of banned members"""
        group_id = test_group["id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/groups/{group_id}/bans",
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Should contain user 2
        banned_ids = [b["user_id"] for b in data]
        assert EXISTING_USER_2["id"] in banned_ids
        print(f"✓ Get banned members: {len(data)} banned users")
    
    def test_banned_user_cannot_send_message(self, api_client, test_group):
        """Banned user cannot send messages"""
        group_id = test_group["id"]
        
        message_data = {
            "group_id": group_id,
            "sender_id": EXISTING_USER_2["id"],
            "content": "Message from banned user",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=message_data)
        assert response.status_code == 403
        print("✓ Banned user correctly cannot send messages")
    
    def test_admin_can_unban_member(self, api_client, test_group):
        """Admin can unban a member"""
        group_id = test_group["id"]
        
        response = api_client.delete(
            f"{BASE_URL}/api/groups/{group_id}/ban/{EXISTING_USER_2['id']}",
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "unbanned"
        print("✓ Member unbanned successfully")
    
    def test_unban_nonexistent(self, api_client, test_group):
        """Unban non-banned user should fail"""
        group_id = test_group["id"]
        
        response = api_client.delete(
            f"{BASE_URL}/api/groups/{group_id}/ban/{EXISTING_USER_2['id']}",
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        assert response.status_code == 404
        print("✓ Unban non-banned user correctly returns 404")
    
    def test_cannot_ban_creator(self, api_client, test_group):
        """Cannot ban the group creator"""
        group_id = test_group["id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/groups/{group_id}/ban/{EXISTING_USER_1['id']}",
            json={"reason": "Trying to ban creator"},
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        assert response.status_code == 400
        print("✓ Ban creator correctly blocked")
    
    def test_cannot_ban_self(self, api_client, test_group):
        """Admin cannot ban themselves"""
        group_id = test_group["id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/groups/{group_id}/ban/{EXISTING_USER_1['id']}",
            json={"reason": "Self ban"},
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        assert response.status_code == 400
        print("✓ Self-ban correctly blocked")
    
    def test_non_admin_cannot_ban(self, api_client, test_group):
        """Non-admin cannot ban members"""
        group_id = test_group["id"]
        
        # First add user 2 back to group
        api_client.post(
            f"{BASE_URL}/api/groups/{group_id}/members/{EXISTING_USER_2['id']}",
            params={"admin_id": EXISTING_USER_1["id"]}
        )
        
        # User 2 (member) tries to ban admin
        response = api_client.post(
            f"{BASE_URL}/api/groups/{group_id}/ban/{EXISTING_USER_1['id']}",
            json={"reason": "Unauthorized ban"},
            params={"admin_id": EXISTING_USER_2["id"]}
        )
        assert response.status_code == 403
        print("✓ Non-admin ban correctly blocked")
    
    def test_non_admin_cannot_view_bans(self, api_client, test_group):
        """Non-admin cannot view ban list"""
        group_id = test_group["id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/groups/{group_id}/bans",
            params={"admin_id": EXISTING_USER_2["id"]}
        )
        assert response.status_code == 403
        print("✓ Non-admin cannot view ban list")


class TestReplyToMessages:
    """Test reply to message feature"""
    
    def test_send_reply_to_message(self, api_client, test_group):
        """Send a message that replies to another message"""
        group_id = test_group["id"]
        
        # Send original message
        original_data = {
            "group_id": group_id,
            "sender_id": EXISTING_USER_1["id"],
            "content": f"Original message for reply test {TEST_PREFIX}",
            "message_type": "text"
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=original_data)
        assert response.status_code == 200
        original_id = response.json()["id"]
        created_message_ids.append(original_id)
        
        # Send reply
        reply_data = {
            "group_id": group_id,
            "sender_id": EXISTING_USER_1["id"],
            "content": f"This is a reply {TEST_PREFIX}",
            "message_type": "text",
            "reply_to_id": original_id
        }
        
        response = api_client.post(f"{BASE_URL}/api/groups/{group_id}/messages", json=reply_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["reply_to_id"] == original_id
        created_message_ids.append(data["id"])
        print("✓ Reply message sent successfully")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_group(self, api_client):
        """Delete the test group if it was created"""
        global created_group_id
        
        if created_group_id and created_group_id != EXISTING_GROUP_ID:
            response = api_client.delete(
                f"{BASE_URL}/api/groups/{created_group_id}",
                params={"user_id": EXISTING_USER_1["id"]}
            )
            if response.status_code == 200:
                print(f"✓ Test group {created_group_id} deleted")
            else:
                print(f"! Test group cleanup failed: {response.status_code}")
        else:
            print("! No test group to cleanup (using existing group)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
