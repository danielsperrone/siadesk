"""Synthesize entirely offline with Piper and produce a synchronized timeline.

Install piper-tts in .motion-tools/piper and download pt_BR-faber-medium first.
This program never sends the narration text to a network service.
"""
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.motion-tools/piper'))
from piper import PiperVoice, SynthesisConfig

FFMPEG = ROOT / '.motion-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
CACHE = ROOT / '.motion-tools/narracao-arquiteturas'
OUTPUT = ROOT / 'entregas/motion-owl-arquiteturas'
PUBLIC = ROOT / 'public/brand/motion-owl'
VOICE = 'pt_BR-faber-medium'
RATE = .93
SAMPLE_RATE = 48000


def run(*args):
    subprocess.run([str(FFMPEG), '-y', '-hide_banner', '-loglevel', 'error', *map(str, args)], check=True, creationflags=subprocess.CREATE_NO_WINDOW)


def stamp(seconds, sep=','):
    ms = round(seconds * 1000)
    return f'{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}{sep}{ms % 1000:03}'


def main():
    for folder in [CACHE, OUTPUT, PUBLIC]:
        folder.mkdir(parents=True, exist_ok=True)
    script = json.loads((ROOT / 'src/motion/owl-architecture-script.json').read_text(encoding='utf-8'))
    voice = PiperVoice.load(str(ROOT / f'.motion-tools/piper-voices/{VOICE}.onnx'))
    syn_config = SynthesisConfig(length_scale=RATE, noise_scale=.667, noise_w_scale=.8)
    chapters, all_pcm, subtitles, cursor = [], [], [], 0
    for item in script:
        phrases = re.split(r'(?<=[.!?])\s+', item['text'])
        pcm_parts, phrase_timings, phrase_cursor = [], [], 0
        for index, phrase in enumerate(phrases):
            wav_source = CACHE / f'{item["id"]}-{index}-source.wav'
            wav = CACHE / f'{item["id"]}-{index}.wav'
            cache_text = CACHE / f'{item["id"]}-{index}.json'
            spoken = phrase.replace('SQL Server Express', 'ésse quê éle sérver expresse').replace('MySQL', 'mai ésse quê éle').replace('VPN', 'vê pê ene').replace('OWL', 'ául').replace('SIAMAC', 'Siamác')
            identity = {'text': spoken, 'voice': VOICE, 'rate': RATE}
            if not wav_source.exists() or not cache_text.exists() or json.loads(cache_text.read_text(encoding='utf-8')) != identity:
                with wave.open(str(wav_source), 'wb') as audio:
                    voice.synthesize_wav(spoken, audio, syn_config=syn_config)
                cache_text.write_text(json.dumps(identity, ensure_ascii=False), encoding='utf-8')
            run('-i', wav_source, '-ac', '1', '-ar', SAMPLE_RATE, '-c:a', 'pcm_s16le', wav)
            with wave.open(str(wav), 'rb') as audio:
                phrase_pcm = audio.readframes(audio.getnframes())
            phrase_duration = len(phrase_pcm) / (2 * SAMPLE_RATE)
            phrase_timings.append((phrase_cursor, phrase_cursor + phrase_duration, phrase))
            pcm_parts.append(phrase_pcm)
            phrase_cursor += phrase_duration
        pcm = b''.join(pcm_parts)
        speech_duration = len(pcm) / (2 * SAMPLE_RATE)
        lead, tail = (.65 if cursor == 0 else .28), .5
        if item['id'] == 'encerramento':
            tail = 1.8
        chapter_frames = math.ceil((lead + speech_duration + tail) * 30)
        chapter_duration = chapter_frames / 30
        tail = chapter_duration - lead - speech_duration
        all_pcm.extend([bytes(round(lead * SAMPLE_RATE) * 2), pcm, bytes(round(tail * SAMPLE_RATE) * 2)])
        chapter = {**item, 'start': cursor, 'end': cursor + chapter_duration, 'speechStart': cursor + lead, 'speechEnd': cursor + lead + speech_duration}
        chapters.append(chapter)
        for start, end, phrase in phrase_timings:
            subtitles.append((cursor + lead + start, cursor + lead + end, phrase))
        cursor += chapter_duration
        print(f'{item["id"]}: voz {speech_duration:.2f}s, cena {chapter_duration:.2f}s', flush=True)
    full_wav = CACHE / 'narracao-completa.wav'
    with wave.open(str(full_wav), 'wb') as audio:
        audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(SAMPLE_RATE)
        audio.writeframes(b''.join(all_pcm))
    output_mp3 = PUBLIC / 'owl-arquiteturas-narracao.mp3'
    # Speech-only mix, comfortable loudness and headroom for phone speakers.
    run('-i', full_wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=9', '-ar', SAMPLE_RATE, '-c:a', 'libmp3lame', '-b:a', '192k', output_mp3)
    (OUTPUT / 'OWL-arquiteturas-narracao.mp3').write_bytes(output_mp3.read_bytes())
    timeline = {'duration': round(cursor, 6), 'voice': VOICE, 'rate': RATE, 'chapters': chapters}
    (ROOT / 'src/motion/owl-architecture-timeline.json').write_text(json.dumps(timeline, ensure_ascii=False, indent=2), encoding='utf-8')
    transcript = 'OWL — Arquiteturas e bancos de dados\nNarração em português brasileiro\n\n' + '\n\n'.join(f'{stamp(c["start"], ".")} — {c["id"]}\n{c["text"]}' for c in chapters) + '\n'
    (OUTPUT / 'OWL-arquiteturas-roteiro.txt').write_text(transcript, encoding='utf-8')
    (OUTPUT / 'OWL-arquiteturas-legendas.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{text}' for i, (a,b,text) in enumerate(subtitles)) + '\n', encoding='utf-8')
    print(f'Duração final: {cursor:.3f}s; {sum(len(c["text"].split()) for c in chapters)} palavras.', flush=True)


if __name__ == '__main__':
    main()
