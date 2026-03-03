<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .email-header {
            background: linear-gradient(135deg, #3b1fa3 0%, #5a3cc0 100%);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }
        .email-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        .email-body {
            padding: 30px 20px;
            color: #333333;
        }
        .success-badge {
            background-color: #52c41a;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
        }
        .message {
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .class-list {
            background-color: #f7f5ff;
            border-left: 4px solid #3b1fa3;
            padding: 15px;
            margin: 20px 0;
        }
        .class-item {
            padding: 10px 0;
            border-bottom: 1px solid #e8e8e8;
        }
        .class-item:last-child {
            border-bottom: none;
        }
        .class-name {
            font-weight: 600;
            color: #3b1fa3;
            font-size: 15px;
        }
        .class-detail {
            font-size: 13px;
            color: #666;
            margin-top: 4px;
        }
        .email-footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #888;
            border-top: 1px solid #e8e8e8;
        }
        .cta-button {
            display: inline-block;
            background-color: #3b1fa3;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="email-header">
            <h1>Hari's Tuition Center</h1>
        </div>

        <!-- Body -->
        <div class="email-body">
            <div class="success-badge">✓ APPROVED</div>
            
            <div class="greeting">
                Dear {{ $studentName }},
            </div>

            <div class="message">
                <p>Congratulations! We are pleased to inform you that your registration has been <strong>approved</strong>.</p>
                
                <p>You are now enrolled in the following classes:</p>
            </div>

            <!-- Class List -->
            <div class="class-list">
                @foreach($classes as $class)
                <div class="class-item">
                    <div class="class-name">
                        {{ $class->subjectName }} - {{ $class->form }}
                    </div>
                    <div class="class-detail">
                        📅 {{ $class->classDay }} • 🕐 {{ $class->startTime }} - {{ $class->finishTime }}
                        @if($class->teacher)
                        • 👤 {{ $class->teacher }}
                        @endif
                    </div>
                </div>
                @endforeach
            </div>

            <div class="message">
                <p>You can now log in to your student portal to access class materials, schedules, and more.</p>
            </div>

            <a href="http://localhost:3000/login" class="cta-button" style="color: #ffffff !important;">Login to Student Portal</a>
        </div>

        <!-- Footer -->
        <div class="email-footer">
            <p>This is an automated email from Hari's Tuition Center.</p>
            <p>If you have any questions, please contact us.</p>
            <p>&copy; {{ date('Y') }} Hari's Tuition Center. All rights reserved.</p>
        </div>
    </div>
</body>
</html>