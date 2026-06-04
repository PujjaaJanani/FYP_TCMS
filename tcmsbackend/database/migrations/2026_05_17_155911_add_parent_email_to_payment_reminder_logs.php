<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddParentEmailToPaymentReminderLogs extends Migration
{
    public function up()
    {
        Schema::table('payment_reminder_logs', function (Blueprint $table) {
            $table->string('parent_email')->nullable()->after('studentId');
        });
    }

    public function down()
    {
        Schema::table('payment_reminder_logs', function (Blueprint $table) {
            $table->dropColumn('parent_email');
        });
    }
}