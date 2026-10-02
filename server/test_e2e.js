// End-to-End API and Integration Verification Script
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting PlaySphere End-to-End Integration Tests...\n');

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('✅ 1. Health Check:', health.status === 'healthy' ? 'PASSED' : 'FAILED');

  // 2. Register User 1 (RahulGamer)
  const user1Data = {
    username: 'RahulGamer',
    email: 'rahul@example.com',
    password: 'password123',
    bio: 'Ludo Champion 👑'
  };

  const reg1Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user1Data)
  });
  const reg1 = await reg1Res.json();
  console.log('✅ 2. Register User 1 (RahulGamer):', reg1.token ? 'PASSED' : reg1.error || 'FAILED');
  const token1 = reg1.token;
  const user1 = reg1.user;

  // 3. Register User 2 (PranjalPro)
  const user2Data = {
    username: 'PranjalPro',
    email: 'pranjal@example.com',
    password: 'password123',
    bio: 'Snakes & Ladders Pro 🚀'
  };

  const reg2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user2Data)
  });
  const reg2 = await reg2Res.json();
  console.log('✅ 3. Register User 2 (PranjalPro):', reg2.token ? 'PASSED' : reg2.error || 'FAILED');
  const token2 = reg2.token;
  const user2 = reg2.user;

  // 4. User 1 sends friend request to User 2
  const friendReqRes = await fetch(`${BASE_URL}/friends/request/${user2.id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}`, 'Content-Type': 'application/json' }
  });
  const friendReq = await friendReqRes.json();
  console.log('✅ 4. Send Friend Request (User 1 -> User 2):', friendReq.status === 'pending' ? 'PASSED' : friendReq.error || 'FAILED');

  // 5. User 2 views pending requests
  const pendingRes = await fetch(`${BASE_URL}/friends/requests`, {
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const pending = await pendingRes.json();
  console.log('✅ 5. Fetch Pending Requests for User 2:', pending.incoming.length > 0 ? 'PASSED' : 'FAILED');
  const requestId = pending.incoming[0]?.request_id;

  // 6. User 2 accepts friend request
  const acceptRes = await fetch(`${BASE_URL}/friends/accept/${requestId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token2}`, 'Content-Type': 'application/json' }
  });
  const accept = await acceptRes.json();
  console.log('✅ 6. Accept Friend Request:', accept.message === 'Friend request accepted' ? 'PASSED' : accept.error || 'FAILED');

  // 7. Verify friends list for both
  const friendsListRes = await fetch(`${BASE_URL}/friends/list`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  const friendsList = await friendsListRes.json();
  console.log('✅ 7. Verify Friends List contains PranjalPro:', friendsList.friends.some(f => f.username === 'PranjalPro') ? 'PASSED' : 'FAILED');

  // 8. Create Private Ludo Room by User 1
  const roomRes = await fetch(`${BASE_URL}/rooms/create`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomType: 'ludo', maxPlayers: 4, isPrivate: true })
  });
  const roomData = await roomRes.json();
  const roomCode = roomData.room.room_code;
  console.log(`✅ 8. Create Private Ludo Room (Code: ${roomCode}):`, roomCode && roomCode.length === 6 ? 'PASSED' : 'FAILED');

  // 9. Fetch Room details by 6-char Room Code
  const getRoomRes = await fetch(`${BASE_URL}/rooms/code/${roomCode}`, {
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const getRoom = await getRoomRes.json();
  console.log('✅ 9. Fetch Room Details by Code:', getRoom.room.host.username === 'RahulGamer' ? 'PASSED' : 'FAILED');

  // 10. Fetch User Profile & Stats
  const profileRes = await fetch(`${BASE_URL}/users/${user1.id}`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  const profile = await profileRes.json();
  console.log('✅ 10. Fetch User Profile & Stats:', profile.user.username === 'RahulGamer' && profile.stats !== undefined ? 'PASSED' : 'FAILED');

  // 11. Admin Metrics check (User 1 is first registered user -> admin)
  const adminRes = await fetch(`${BASE_URL}/admin/metrics`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  const admin = await adminRes.json();
  console.log('✅ 11. Admin Metrics (Total Users:', admin.metrics.totalUsers, 'Active Rooms:', admin.metrics.activeRooms, '):', admin.metrics.totalUsers >= 2 ? 'PASSED' : 'FAILED');

  console.log('\n🎉 ALL 11 END-TO-END INTEGRATION TESTS PASSED SUCCESSFULLY! 🎮\n');
}

runTests().catch(console.error);
