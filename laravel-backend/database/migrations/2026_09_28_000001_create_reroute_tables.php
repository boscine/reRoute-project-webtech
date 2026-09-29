<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Buildings
        Schema::create('buildings', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        // 2. Floors
        Schema::create('floors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('building_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->integer('order')->default(1);
            $table->timestamps();

            $table->unique(['building_id', 'label']);
        });

        // 3. Locations
        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('floor_id')->constrained()->cascadeOnDelete();
            $table->string('qr_slug')->unique();
            $table->timestamps();
        });

        // 4. ScanLogs
        Schema::create('scan_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->string('qr_slug_raw');
            $table->boolean('resolved')->default(false);
            $table->timestamp('created_at')->useCurrent();
        });

        // 5. ActivityLogs
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('target_type');
            $table->string('target_id')->nullable();
            $table->text('details')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('scan_logs');
        Schema::dropIfExists('locations');
        Schema::dropIfExists('floors');
        Schema::dropIfExists('buildings');
    }
};
