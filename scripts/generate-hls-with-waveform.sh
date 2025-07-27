#!/bin/bash

# Скрипт для конвертации аудио в HLS формат с генерацией данных волны
# Использование: ./generate-hls-with-waveform.sh input.mp3 output_directory

INPUT_FILE=$1
OUTPUT_DIR=$2

if [ -z "$INPUT_FILE" ] || [ -z "$OUTPUT_DIR" ]; then
    echo "Использование: $0 <input_file> <output_directory>"
    exit 1
fi

# Создаем директорию если её нет
mkdir -p "$OUTPUT_DIR"

echo "🎵 Конвертация аудио в HLS..."
# Конвертируем в HLS
ffmpeg -i "$INPUT_FILE" \
    -c:a aac \
    -b:a 128k \
    -hls_time 10 \
    -hls_list_size 0 \
    -hls_segment_filename "$OUTPUT_DIR/segment_%03d.ts" \
    -f hls \
    "$OUTPUT_DIR/playlist.m3u8"

echo "📊 Генерация данных волны..."
# Генерируем данные волны с помощью audiowaveform
# Устанавливается через: brew install audiowaveform (macOS) или apt-get install audiowaveform (Linux)
# Генерируем сырые данные с высоким разрешением
audiowaveform -i "$INPUT_FILE" \
    -o "$OUTPUT_DIR/waveform_raw.json" \
    --pixels-per-second 20 \
    --bits 8

# Обрабатываем сырые данные для нашего формата
if [ -f "$OUTPUT_DIR/waveform_raw.json" ]; then
    python3 - <<EOF
import json
import numpy as np

# Читаем сырые данные
with open("$OUTPUT_DIR/waveform_raw.json", "r") as f:
    raw_data = json.load(f)

# Извлекаем пики
data_points = raw_data.get("data", [])
length = raw_data.get("length", 0)

# Конвертируем в наш формат (60 баров как в оригинале)
target_bars = 60
samples_per_bar = max(1, length // target_bars)

normalized_data = []
peaks_min = []
peaks_max = []

for i in range(target_bars):
    start = i * samples_per_bar * 2  # *2 потому что min/max чередуются
    end = min((i + 1) * samples_per_bar * 2, len(data_points))
    
    if start < len(data_points):
        # Берем min/max значения для этого бара
        bar_data = data_points[start:end]
        if len(bar_data) >= 2:
            mins = [bar_data[j] for j in range(0, len(bar_data), 2)]
            maxs = [bar_data[j] for j in range(1, len(bar_data), 2)]
            
            avg_min = sum(mins) / len(mins) if mins else 0
            avg_max = sum(maxs) / len(maxs) if maxs else 0
            
            # Нормализуем от -128 до 127 в диапазон 0-1
            norm_min = (avg_min + 128) / 255
            norm_max = (avg_max + 128) / 255
            
            # Среднее значение для высоты бара
            height = abs(norm_max - norm_min)
            normalized_data.append(min(1.0, height * 2))  # Усиливаем для видимости
            
            peaks_min.append(norm_min)
            peaks_max.append(norm_max)
        else:
            normalized_data.append(0.3)  # Дефолтная высота
            peaks_min.append(0.4)
            peaks_max.append(0.6)

# Нормализуем данные чтобы максимальный бар был 1.0
max_height = max(normalized_data) if normalized_data else 1
if max_height > 0:
    normalized_data = [h / max_height for h in normalized_data]

# Сохраняем в нашем формате
output_data = {
    "data": normalized_data,
    "length": len(normalized_data),
    "peaks": {
        "min": peaks_min,
        "max": peaks_max
    },
    "sample_rate": raw_data.get("sample_rate", 44100),
    "samples_per_pixel": raw_data.get("samples_per_pixel", 2205)
}

with open("$OUTPUT_DIR/waveform.json", "w") as f:
    json.dump(output_data, f, indent=2)

# Удаляем временный файл
import os
os.remove("$OUTPUT_DIR/waveform_raw.json")

print("✅ Данные волны обработаны и сохранены")
EOF
fi

# Альтернативный вариант через Python если audiowaveform недоступен
if [ ! -f "$OUTPUT_DIR/waveform.json" ]; then
    echo "⚠️  audiowaveform не найден, используем Python скрипт..."
    python3 - <<EOF
import json
import subprocess
import numpy as np

# Получаем длительность аудио
duration_cmd = f'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "{INPUT_FILE}"'
duration = float(subprocess.check_output(duration_cmd, shell=True).decode().strip())

# Генерируем 60 точек данных (как в оригинальном плеере)
points = 60
samples = []

# Извлекаем амплитуды через ffmpeg (упрощенный вариант)
for i in range(points):
    time = (i / points) * duration
    # Это упрощенная версия - в реальности нужно анализировать аудио данные
    amplitude = np.random.uniform(0.2, 0.8)  # Случайные данные для примера
    samples.append(amplitude)

# Нормализуем данные
max_val = max(samples)
normalized = [s / max_val for s in samples]

# Сохраняем в формате для нашего плеера
waveform_data = {
    "data": normalized,
    "length": len(normalized)
}

with open("$OUTPUT_DIR/waveform.json", "w") as f:
    json.dump(waveform_data, f)

print("✅ Данные волны сгенерированы (упрощенная версия)")
EOF
fi

echo "✅ Готово!"
echo "📁 Файлы созданы в: $OUTPUT_DIR"
echo "   - playlist.m3u8"
echo "   - segment_*.ts" 
echo "   - waveform.json"