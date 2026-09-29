<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Building;
use App\Models\Floor;
use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Super Admin
        $admin = User::updateOrCreate(
            ['email' => 'admin@reroute.campus'],
            [
                'name' => 'Campus Admin',
                'password' => Hash::make('admin12345'),
                'role' => 'SUPERADMIN',
                'is_active' => true,
            ]
        );

        // 2. Seed Campus Buildings, Floors, and Locations
        $campus = [
            [
                'name' => 'North Hall',
                'floors' => [
                    ['label' => 'Ground Floor', 'order' => 1, 'slug' => 'nh-gf'],
                    ['label' => 'Floor 1', 'order' => 2, 'slug' => 'nh-f1'],
                    ['label' => 'Floor 2', 'order' => 3, 'slug' => 'nh-f2'],
                    ['label' => 'Floor 3', 'order' => 4, 'slug' => 'nh-f3'],
                ],
            ],
            [
                'name' => 'Science Centre',
                'floors' => [
                    ['label' => 'Basement Lab', 'order' => 1, 'slug' => 'sc-b1'],
                    ['label' => 'Floor 1', 'order' => 2, 'slug' => 'sc-f1'],
                    ['label' => 'Floor 2', 'order' => 3, 'slug' => 'sc-f2'],
                ],
            ],
            [
                'name' => 'Student Hub',
                'floors' => [
                    ['label' => 'Level 1 Dining & Commons', 'order' => 1, 'slug' => 'sh-l1'],
                    ['label' => 'Level 2 Student Affairs', 'order' => 2, 'slug' => 'sh-l2'],
                ],
            ],
            [
                'name' => 'Library Building',
                'floors' => [
                    ['label' => 'Floor 1 Circulation', 'order' => 1, 'slug' => 'lib-f1'],
                    ['label' => 'Floor 2 Quiet Study', 'order' => 2, 'slug' => 'lib-f2'],
                    ['label' => 'Floor 3 Archives', 'order' => 3, 'slug' => 'lib-f3'],
                ],
            ],
        ];

        foreach ($campus as $bData) {
            $building = Building::firstOrCreate(['name' => $bData['name']]);

            foreach ($bData['floors'] as $fData) {
                $floor = Floor::firstOrCreate(
                    [
                        'building_id' => $building->id,
                        'label' => $fData['label'],
                    ],
                    [
                        'order' => $fData['order'],
                    ]
                );

                Location::firstOrCreate(
                    ['qr_slug' => $fData['slug']],
                    ['floor_id' => $floor->id]
                );
            }
        }

        ActivityLog::create([
            'user_id' => $admin->id,
            'action' => 'SEED',
            'target_type' => 'System',
            'target_id' => 'InitialSeed',
            'details' => json_encode(['message' => 'Sample campus buildings, floors, and QR targets seeded']),
            'created_at' => now(),
        ]);
    }
}
