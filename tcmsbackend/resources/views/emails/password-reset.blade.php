<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #3b1fa3 0%, #5b4fc4 100%);
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
        }
        .message {
            color: #555;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #3b1fa3 0%, #5b4fc4 100%);
            color: white !important;
            text-decoration: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .note {
            font-size: 12px;
            color: #999;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Hari's Tuition Center</h1>
        </div>
        <div class="content">
            <div class="greeting">
                Dear {{ $name }},
            </div>
            <div class="message">
                We received a request to reset your password for your HTC account.
                Click the button below to create a new password:
            </div>
            <div style="text-align: center;">
                <a href="{{ $resetLink }}" class="button">Reset Password</a>
            </div>
            <div class="message">
                If you didn't request this, please ignore this email. Your password will remain unchanged.
            </div>
            <div class="note">
                <strong>Note:</strong> This link will expire in 60 minutes for security reasons.
                <br><br>
                If the button doesn't work, copy and paste this link into your browser:
                <br>
                <span style="color: #3b1fa3; word-break: break-all;">{{ $resetLink }}</span>
            </div>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Hari's Tuition Center. All rights reserved.
            <br>
            This is an automated message, please do not reply.
        </div>
    </div>
</body>
</html>