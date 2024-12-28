from flask import Flask, jsonify, render_template, request
import mysql.connector
import random

app = Flask(__name__)

# Konfigurasi MySQL
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'susu_segar'
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

# Fungsi untuk mendapatkan data produksi dari database
def get_produksi_data():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT tahun, produksi FROM produksi_susu ORDER BY tahun ASC")
    data = cursor.fetchall()
    cursor.close()
    connection.close()
    return data

# Fungsi untuk menyimpan data baru ke database
def save_produksi_data(tahun, produksi):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("INSERT INTO produksi_susu (tahun, produksi) VALUES (%s, %s)", (tahun, produksi))
    connection.commit()
    cursor.close()
    connection.close()

# Fungsi Linear Congruential Generator (LCG)
def lcg(seed, a, c, m, num_iterations):
    result = []
    for _ in range(num_iterations):
        seed = (a * seed + c) % m
        result.append(seed % 1000)  # Menghasilkan angka 3 digit
    return result

# Route untuk halaman utama
@app.route('/')
def home():
    return render_template('monte_carlo_web.html')

# API untuk mengambil data produksi
@app.route('/api/data', methods=['GET'])
def get_data():
    data = get_produksi_data()
    return jsonify(data)

# API untuk menambahkan data baru
@app.route('/api/add-data', methods=['POST'])
def add_data():
    try:
        tahun = int(request.json['tahun'])
        produksi = int(request.json['produksi'])
        save_produksi_data(tahun, produksi)
        return jsonify({'message': 'Data berhasil ditambahkan'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# API untuk memperbarui data produksi
@app.route('/api/update-data', methods=['POST'])
def update_data():
    try:
        tahun = int(request.json['tahun'])
        produksi = int(request.json['produksi'])
        
        # Perbarui data di database
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("UPDATE produksi_susu SET produksi = %s WHERE tahun = %s", (produksi, tahun))
        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({'message': 'Data berhasil diperbarui'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# API untuk melakukan prediksi menggunakan Monte Carlo dengan LCG
@app.route('/api/prediksi', methods=['GET'])
def get_predictions():
    data = get_produksi_data()
    
    # Tentukan tahun terakhir
    last_year = max([entry['tahun'] for entry in data])
    
    # Melakukan perhitungan Monte Carlo untuk prediksi tahun depan dengan LCG
    predictions = monte_carlo_prediction_with_lcg(data, last_year)
    
    return jsonify(predictions)

# Fungsi untuk perhitungan Monte Carlo dengan LCG untuk prediksi
def monte_carlo_prediction_with_lcg(data, last_year):
    # Parameter LCG
    seed = 42
    a = 1664525
    c = 1013904223
    m = 2**32
    num_iterations = 5  # Misalnya, kita buat 5 angka acak untuk prediksi
    
    # Menghasilkan angka acak dengan LCG
    lcg_numbers = lcg(seed, a, c, m, num_iterations)
    
    predictions = []
    last_production = data[-1]['produksi']  # Produksi tahun terakhir
    
    # Simulasi prediksi untuk 5 tahun ke depan dengan LCG
    for i in range(5):
        new_year = last_year + i + 1
        random_factor = lcg_numbers[i] / 1000  # Menggunakan angka acak dari LCG
        predicted_production = last_production * (1 + (random_factor - 0.5) * 0.2)  # Perubahan ±10%
        
        predictions.append({
            'tahun': new_year,
            'produksi': round(predicted_production)
        })
        
        last_production = predicted_production
    
    return predictions

if __name__ == '__main__':
    app.run(debug=True)
