<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use App\Models\User;

class ReconciliationTest extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a test user
        $this->user = User::factory()->create();
    }

    /** @test */
    public function it_validates_required_columns_in_uploaded_file()
    {
        // Create a CSV with required columns
        $csvContent = "Date,Amount,Transaction Id\n";
        $csvContent .= "2025-01-01,100.00,TXN001\n";
        $csvContent .= "2025-01-02,200.00,TXN002\n";

        $file = UploadedFile::fake()->createWithContent('test.csv', $csvContent);

        $response = $this->actingAs($this->user)->post('/api/reconcile', [
            'file' => $file,
            'mode' => 'by_transaction_id'
        ]);

        // Should not return validation error for missing columns
        $response->assertStatus(200);
    }

    /** @test */
    public function it_fails_validation_when_required_columns_are_missing()
    {
        // Create a CSV missing required columns
        $csvContent = "Some Column,Another Column\n";
        $csvContent .= "Value1,Value2\n";

        $file = UploadedFile::fake()->createWithContent('invalid.csv', $csvContent);

        $response = $this->actingAs($this->user)->post('/api/reconcile', [
            'file' => $file,
            'mode' => 'by_transaction_id'
        ]);

        // Should return 500 with validation error
        $response->assertStatus(500);
        $response->assertJsonFragment([
            'message' => 'The file is missing required columns. Please ensure your file includes Transaction ID, Date, and Amount columns.'
        ]);
    }

    /** @test */
    public function it_validates_file_with_cd_amount_format()
    {
        // Create a CSV with C/D and Amount columns (common format)
        $csvContent = "Date,C/D,Amount,Transaction Id\n";
        $csvContent .= "2025-01-01,D,100.00,TXN001\n";
        $csvContent .= "2025-01-02,C,200.00,TXN002\n";

        $file = UploadedFile::fake()->createWithContent('cd_format.csv', $csvContent);

        $response = $this->actingAs($this->user)->post('/api/reconcile', [
            'file' => $file,
            'mode' => 'by_transaction_id'
        ]);

        // Should pass validation
        $response->assertStatus(200);
    }

    /** @test */
    public function it_fails_validation_with_invalid_dates()
    {
        // Create a CSV with invalid dates
        $csvContent = "Date,Amount,Transaction Id\n";
        $csvContent .= "invalid-date,100.00,TXN001\n";
        $csvContent .= "2025-01-02,200.00,TXN002\n";

        $file = UploadedFile::fake()->createWithContent('invalid_dates.csv', $csvContent);

        $response = $this->actingAs($this->user)->post('/api/reconcile', [
            'file' => $file,
            'mode' => 'by_transaction_id'
        ]);

        // Should return validation error for invalid date
        $response->assertStatus(500);
        $response->assertJsonFragment([
            'message' => 'Some data in the file is invalid. Please check that dates are properly formatted and amounts are numeric.'
        ]);
    }

    /** @test */
    public function it_validates_sample_data_file_format()
    {
        // Use the actual sample data format from the project
        $csvContent = "Date	Service	Reference	Amount	commission	Amount to Settle	Currency	C/D	Paid At	Paid By	Payer Contact	Transaction Id	Status	Narration	Receipt No	Comment\n";
        $csvContent .= "01/10/2025 08:24	Kowri Services	smarfo@npontu.com	99100	0	0	GHS	C	DreamOval	Philip Essel	philip.essel@kowri.app	6.36391E+14	CONFIRMED	Topup of Npontu Technologies Switching Account account by DreamOval	N/A	N/A\n";
        $csvContent .= "01/10/2025 09:03	MTN Money MADAPI	2.33548E+11	9542	0	9542	GHS	D	Npontu Technologies Switching Account	WARC Africa	N/A	112547POpMWX1759309378	CONFIRMED	WARC Africa	65991463250	N/A\n";

        $file = UploadedFile::fake()->createWithContent('sample_data.csv', $csvContent);

        $response = $this->actingAs($this->user)->post('/api/reconcile', [
            'file' => $file,
            'mode' => 'by_transaction_id'
        ]);

        // Should pass validation since it has Date, Amount, Transaction Id, and C/D columns
        $response->assertStatus(200);
    }
}