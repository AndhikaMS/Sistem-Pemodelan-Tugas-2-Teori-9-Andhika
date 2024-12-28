// Fungsi utama yang dijalankan saat DOM selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
    initializeDataTable(); // Menginisialisasi tabel data utama
    setupTabNavigation();  // Mengatur navigasi antar tab
    setupAddDataForm();    // Mengatur form tambah data
    generatePredictions();
    calculateInterval(); // Hitung interval dan tampilkan
    generateRandomNumbers(); // Generate bilangan acak dan tampilkan
});

/**
 * Menginisialisasi tabel data utama dengan memuat data dari backend
 */
async function initializeDataTable() {
    const dataTableBody = document.getElementById("data-table-body");

    try {
        const response = await fetch('/api/data');
        const data = await response.json();

        data.forEach(entry => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><span class="tahun">${entry.tahun}</span></td>
                <td><span class="produksi">${entry.produksi}</span></td>
                <td>
                    <button class="edit-btn" data-tahun="${entry.tahun}">Edit</button>
                </td>
            `;
            dataTableBody.appendChild(row);
        });

        // Tambahkan event listener untuk tombol Edit
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', handleEditClick);
        });
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

/**
 * Mengatur navigasi antar tab di halaman
 */
function setupTabNavigation() {
    const tabLinks = document.querySelectorAll(".tab-link");
    const tabContents = document.querySelectorAll(".tab-content");

    tabLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const targetTab = event.target.getAttribute("data-tab");

            // Sembunyikan semua tab
            tabContents.forEach(content => content.style.display = "none");

            // Tampilkan tab yang sesuai
            document.getElementById(targetTab).style.display = "block";
        });
    });

    // Tampilkan tab pertama secara default
    document.getElementById("tentang").style.display = "block";
}

/**
 * Mengatur form tambah data
 */
function setupAddDataForm() {
    const addButton = document.createElement("button");
    addButton.textContent = "Tambahkan Data";
    addButton.id = "add-data-btn";
    document.getElementById("data").appendChild(addButton);

    const addFormContainer = document.createElement("div");
    addFormContainer.id = "add-data-form";
    addFormContainer.style.display = "none";

    addFormContainer.innerHTML = `
        <label for="new-year">Tahun:</label>
        <input type="number" id="new-year" required>
        <label for="new-production">Produksi (Ton):</label>
        <input type="number" id="new-production" required>
        <button id="save-data-btn">Simpan</button>
        <button id="cancel-data-btn">Batalkan</button>
    `;

    document.getElementById("data").appendChild(addFormContainer);

    addButton.addEventListener("click", () => {
        addFormContainer.style.display = "block";
    });

    document.getElementById("cancel-data-btn").addEventListener("click", () => {
        addFormContainer.style.display = "none";
    });

    document.getElementById("save-data-btn").addEventListener("click", async () => {
        const year = document.getElementById("new-year").value;
        const production = document.getElementById("new-production").value;

        try {
            const response = await fetch('/api/add-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tahun: year, produksi: production })
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                location.reload(); // Reload halaman untuk memperbarui data
            } else {
                alert(result.error || "Terjadi kesalahan");
            }
        } catch (error) {
            console.error("Error adding data:", error);
            alert("Terjadi kesalahan saat menambahkan data");
        }
    });
}

async function generatePredictions() {
    const response = await fetch('/api/data');
    const data = await response.json();
    
    // Menentukan tahun terakhir dalam data
    const lastYear = Math.max(...data.map(entry => entry.tahun));
    
    // Simulasi prediksi untuk tahun selanjutnya berdasarkan Monte Carlo atau metode yang sesuai
    const predictions = monteCarloPrediction(data, lastYear);
    
    // Menampilkan hasil prediksi di tabel
    const resultTableBody = document.querySelector("#hasil tbody");
    resultTableBody.innerHTML = '';  // Bersihkan tabel yang ada

    predictions.forEach(prediction => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${prediction.tahun}</td>
            <td>${prediction.produksi}</td>
        `;
        resultTableBody.appendChild(row);
    });
}

/**
 * Fungsi untuk menghasilkan prediksi menggunakan metode Monte Carlo
 * @param {Array} data - Data historis produksi susu
 * @param {number} lastYear - Tahun terakhir dari data yang ada
 * @returns {Array} - Daftar prediksi untuk tahun berikutnya
 */
function monteCarloPrediction(data, lastYear) {
    // Anggap data adalah array dari { tahun, produksi }
    const predictions = [];
    
    // Logika sederhana untuk memprediksi tahun berikutnya
    let lastProduction = data[data.length - 1].produksi;
    
    // Misalkan kita prediksi 5 tahun ke depan
    for (let i = 1; i <= 5; i++) {
        const newYear = lastYear + i;
        
        // Menggunakan angka acak untuk simulasi (Monte Carlo)
        const randomFactor = Math.random(); // Angka acak antara 0 dan 1
        const predictedProduction = lastProduction * (1 + (randomFactor - 0.5) * 0.2); // Perubahan ±10% untuk simulasi
        
        predictions.push({
            tahun: newYear,
            produksi: Math.round(predictedProduction)
        });
        
        // Update produksi untuk tahun berikutnya
        lastProduction = predictedProduction;
    }

    return predictions;
}

// Fungsi untuk menghitung interval dan menampilkannya pada tabel
async function calculateInterval() {
    const response = await fetch('/api/data');
    const data = await response.json();

    const totalProduction = data.reduce((sum, entry) => sum + entry.produksi, 0);
    const meanProduction = totalProduction / data.length;

    const intervalTableBody = document.getElementById("interval-table");
    intervalTableBody.innerHTML = ''; // Bersihkan tabel

    let cumulative = 0;
    data.forEach((entry, index) => {
        const probability = entry.produksi / totalProduction;
        cumulative += probability;

        const intervalStart = cumulative - probability;
        const intervalEnd = cumulative;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.tahun}</td>
            <td>${entry.produksi}</td>
            <td>${(probability * 100).toFixed(2)}%</td>
            <td>${(cumulative * 100).toFixed(2)}%</td>
            <td>${intervalStart.toFixed(2)} - ${intervalEnd.toFixed(2)}</td>
        `;
        intervalTableBody.appendChild(row);
    });
}

// Fungsi untuk menghitung dan menampilkan bilangan acak dengan LCG
async function generateRandomNumbers() {
    const response = await fetch('/api/prediksi');
    const predictions = await response.json();

    const rngTableBody = document.getElementById("rng-table");
    rngTableBody.innerHTML = ''; // Bersihkan tabel

    predictions.forEach((prediction, index) => {
        const zi = Math.floor(Math.random() * 1000); // Generate angka acak antara 0-999
        const a = 1664525, c = 1013904223, m = 2 ** 32;
        const lcgResult = (a * zi + c) % m;
        const aZiPlusC = (a * zi) + c;
        const modM = aZiPlusC % m;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${zi}</td>
            <td>${aZiPlusC}</td>
            <td>${modM}</td>
            <td>${modM % 1000}</td>
        `;
        rngTableBody.appendChild(row);
    });
}

/**
 * Event handler untuk tombol Edit
 */
function handleEditClick(event) {
    const button = event.target;
    const row = button.closest('tr');
    const tahun = row.querySelector('.tahun').textContent;
    const produksi = row.querySelector('.produksi').textContent;

    // Ubah sel menjadi input field untuk edit
    row.innerHTML = `
        <td><input type="text" class="edit-tahun" value="${tahun}" readonly></td>
        <td><input type="number" class="edit-produksi" value="${produksi}"></td>
        <td>
            <button class="save-btn" data-tahun="${tahun}">Simpan</button>
            <button class="cancel-btn">Batal</button>
        </td>
    `;

    // Tambahkan event listener untuk tombol Simpan dan Batal
    row.querySelector('.save-btn').addEventListener('click', handleSaveClick);
    row.querySelector('.cancel-btn').addEventListener('click', () => {
        // Kembalikan tampilan awal jika pembatalan
        row.innerHTML = `
            <td><span class="tahun">${tahun}</span></td>
            <td><span class="produksi">${produksi}</span></td>
            <td>
                <button class="edit-btn" data-tahun="${tahun}">Edit</button>
            </td>
        `;
        row.querySelector('.edit-btn').addEventListener('click', handleEditClick);
    });
}

/**
 * Event handler untuk tombol Simpan
 */
async function handleSaveClick(event) {
    const button = event.target;
    const row = button.closest('tr');
    const tahun = row.querySelector('.edit-tahun').value;
    const produksi = row.querySelector('.edit-produksi').value;

    try {
        const response = await fetch('/api/update-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tahun, produksi })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            location.reload(); // Muat ulang halaman setelah data diperbarui
        } else {
            alert(result.error || "Terjadi kesalahan");
        }
    } catch (error) {
        console.error("Error updating data:", error);
        alert("Terjadi kesalahan saat mengupdate data");
    }
}
