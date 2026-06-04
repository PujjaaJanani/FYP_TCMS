<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePaymentReminderLogsTable extends Migration
{
    public function up()
    {
        Schema::create('payment_reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->integer('studentId');
            $table->integer('registrationId');
            $table->string('phone', 20);
            $table->text('message');
            $table->date('reminder_date');
            $table->enum('reminder_type', ['first_day', 'fifteenth_day']);
            $table->timestamps();
            
            // Indexes for faster queries
            $table->index('studentId');
            $table->index('reminder_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('payment_reminder_logs');
    }
}