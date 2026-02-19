<?php
session_start();
if (isset($_SESSION['logged_in'])) {
    header('Location: dashboard.html');
    exit;
}
?>
<!DOCTYPE html>
<html class="dark">
<head>
    <title>Portal Access</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .glass {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
    </style>
</head>
<body class="bg-black flex items-center justify-center h-screen font-sans">
    <div class="glass p-8 rounded-xl shadow-2xl w-full max-w-sm">
        <h2 class="text-3xl text-yellow-400 font-bold mb-6 text-center">Restricted Access</h2>
        <form id="loginForm" class="space-y-6">
            <div>
                <label class="block text-gray-300 mb-2 text-sm uppercase tracking-wide">Username</label>
                <input type="text" id="username" class="w-full p-3 rounded bg-gray-900/50 text-white border border-gray-700 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition">
            </div>
            <div>
                <label class="block text-gray-300 mb-2 text-sm uppercase tracking-wide">Password</label>
                <input type="password" id="password" class="w-full p-3 rounded bg-gray-900/50 text-white border border-gray-700 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition">
            </div>
            <button type="submit" class="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold p-3 rounded transition shadow-lg hover:shadow-yellow-400/20">Login</button>
            <div class="text-center mt-4">
                <a href="forgot-password.php" class="text-gray-500 hover:text-white text-sm transition font-medium">Forgot Password?</a>
            </div>
        </form>
        <p id="error" class="text-red-500 mt-4 text-center hidden font-bold"></p>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            
            // Pointing to PHPs backend
            const res = await fetch('admin_backend.php?action=login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: u, password: p})
            });
            
            const data = await res.json();
            
            if (data.success) {
                window.location.href = 'dashboard.html';
            } else {
                document.getElementById('error').textContent = 'Invalid credentials';
                document.getElementById('error').classList.remove('hidden');
            }
        });
    </script>
</body>
</html>
