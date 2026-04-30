use std::{
    fs::File,
    io::{Read, Seek, SeekFrom},
};

pub(super) struct FrameHeaderInfo {
    pub bitrate_kbps: u32,
    pub sample_rate_hz: u32,
}

const MPEG1_LAYER3_BITRATE_KBPS: [u32; 16] = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
];
const MPEG2_LAYER3_BITRATE_KBPS: [u32; 16] = [
    0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0,
];
const MPEG1_SAMPLE_RATE_HZ: [u32; 4] = [44_100, 48_000, 32_000, 0];
const MPEG2_SAMPLE_RATE_HZ: [u32; 4] = [22_050, 24_000, 16_000, 0];
const MPEG25_SAMPLE_RATE_HZ: [u32; 4] = [11_025, 12_000, 8_000, 0];

pub(super) fn read_frame_header_info(file_path: &str) -> Result<FrameHeaderInfo, String> {
    let mut file = File::open(file_path)
        .map_err(|e| format!("音源ファイルの読み込みに失敗しました: {}", e))?;
    let start_offset = read_audio_start_offset(&mut file)?;

    file.seek(SeekFrom::Start(start_offset))
        .map_err(|e| format!("音源ファイルの読み込み位置変更に失敗しました: {}", e))?;

    let mut header_bytes = [0_u8; 4];

    file.read_exact(&mut header_bytes)
        .map_err(|e| format!("音源ファイルのヘッダー読み込みに失敗しました: {}", e))?;

    loop {
        let header = u32::from_be_bytes(header_bytes);

        if let Some(frame_header_info) = parse_frame_header(header) {
            return Ok(frame_header_info);
        }

        let mut next_byte = [0_u8; 1];

        if file.read_exact(&mut next_byte).is_err() {
            break;
        }

        header_bytes[0] = header_bytes[1];
        header_bytes[1] = header_bytes[2];
        header_bytes[2] = header_bytes[3];
        header_bytes[3] = next_byte[0];
    }

    Err("MP3ヘッダーの解析に失敗しました".to_string())
}

fn read_audio_start_offset(file: &mut File) -> Result<u64, String> {
    let mut id3_header = [0_u8; 10];

    file.read_exact(&mut id3_header)
        .map_err(|e| format!("ID3ヘッダーの読み込みに失敗しました: {}", e))?;

    if &id3_header[0..3] != b"ID3" {
        file.seek(SeekFrom::Start(0))
            .map_err(|e| format!("音源ファイルの読み込み位置変更に失敗しました: {}", e))?;

        return Ok(0);
    }

    let tag_size = ((id3_header[6] as u64) << 21)
        | ((id3_header[7] as u64) << 14)
        | ((id3_header[8] as u64) << 7)
        | id3_header[9] as u64;
    let footer_size = if id3_header[5] & 0b0001_0000 != 0 {
        10
    } else {
        0
    };

    Ok(10 + tag_size + footer_size)
}

fn parse_frame_header(header: u32) -> Option<FrameHeaderInfo> {
    if header & 0xFFE0_0000 != 0xFFE0_0000 {
        return None;
    }

    let version_bits = ((header >> 19) & 0b11) as u8;
    let layer_bits = ((header >> 17) & 0b11) as u8;
    let bitrate_index = ((header >> 12) & 0b1111) as usize;
    let sample_rate_index = ((header >> 10) & 0b11) as usize;

    if version_bits == 0b01
        || layer_bits != 0b01
        || bitrate_index == 0
        || bitrate_index == 0b1111
        || sample_rate_index == 0b11
    {
        return None;
    }

    let bitrate_kbps = match version_bits {
        0b11 => MPEG1_LAYER3_BITRATE_KBPS[bitrate_index],
        0b10 | 0b00 => MPEG2_LAYER3_BITRATE_KBPS[bitrate_index],
        _ => 0,
    };
    let sample_rate_hz = match version_bits {
        0b11 => MPEG1_SAMPLE_RATE_HZ[sample_rate_index],
        0b10 => MPEG2_SAMPLE_RATE_HZ[sample_rate_index],
        0b00 => MPEG25_SAMPLE_RATE_HZ[sample_rate_index],
        _ => 0,
    };

    if bitrate_kbps == 0 || sample_rate_hz == 0 {
        return None;
    }

    Some(FrameHeaderInfo {
        bitrate_kbps,
        sample_rate_hz,
    })
}

#[cfg(test)]
mod tests {
    use super::parse_frame_header;

    #[test]
    fn parses_mpeg1_layer3_header() {
        let info = parse_frame_header(0xFFFB_9000).expect("valid frame header");

        assert_eq!(info.bitrate_kbps, 128);
        assert_eq!(info.sample_rate_hz, 44_100);
    }

    #[test]
    fn rejects_invalid_headers() {
        assert!(parse_frame_header(0).is_none());
        assert!(parse_frame_header(0xFFFB_F000).is_none());
    }
}
