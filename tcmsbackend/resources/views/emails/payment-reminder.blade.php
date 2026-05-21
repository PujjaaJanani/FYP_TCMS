<!DOCTYPE html>
<html>
<head>
    <title>Payment Reminder</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #3b1fa3;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .amount {
            font-size: 28px;
            font-weight: bold;
            color: #f5222d;
        }
        .children-list {
            background-color: #fff;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #3b1fa3;
        }
        .button {
            background-color: #3b1fa3;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            margin-top: 20px;
            font-weight: 700;
            font-size: 16px;
            border: none;
            transition: all 0.3s ease;
        }
        .button:hover {
            background-color: #2a157a;
            transform: scale(1.02);
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Hari's Tuition Center</h2>
        </div>
        <div class="content">
            <p>Dear Parent,</p>
            
            <p>This is a friendly reminder that tuition fees for the following child(ren) are due:</p>
            
            <div class="children-list">
                <strong>{{ $childrenNames }}</strong>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <div class="amount">RM {{ number_format($totalFee, 2) }}</div>
                <p><strong>Due for: {{ $dueMonth }}</strong></p>
            </div>
            
            <p>Please log in to your account to make the payment as soon as possible.</p>
            
            <div style="text-align: center;">
                <a href="{{ url('/parent/payment') }}" class="button">Pay Now</a>
            </div>
            
            <p style="margin-top: 20px;">If you have already made the payment, please disregard this message.</p>
            
            <p>Thank you for your cooperation!</p>
            <p><strong>Hari's Tuition Center</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© {{ date('Y') }} Hari's Tuition Center. All rights reserved.</p>
        </div>
    </div>
</body>
</html>