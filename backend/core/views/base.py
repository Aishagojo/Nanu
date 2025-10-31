import os
from django.http import JsonResponse
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from pydub import AudioSegment
import speech_recognition as sr
from tempfile import NamedTemporaryFile


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return JsonResponse({"status": "ok"})

@api_view(["GET"])
@permission_classes([AllowAny])
def index(request):
    return JsonResponse({"name": "EduAssist", "docs": "/api/docs/", "health": "/api/core/health/"})

@api_view(["GET"])
@permission_classes([AllowAny])
def help_view(request):
    return JsonResponse(
        {
            "help": "Use the chatbot or menu to find courses, fees, and resources. You can also speak by pressing the microphone button.",
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def about_view(request):
    return JsonResponse(
        {
            "name": "EduAssist",
            "mission": "Accessible learning support for all students.",
            "values": ["Accessibility", "Simplicity", "Privacy", "Support"],
        }
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def transcribe_audio(request):
    upload = request.FILES.get("audio")
    if not upload:
        return Response({"detail": "audio file is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Save uploaded audio temporarily
    with NamedTemporaryFile(suffix=".webm", delete=False) as temp_audio:
        for chunk in upload.chunks():
            temp_audio.write(chunk)
        temp_audio_path = temp_audio.name

    try:
        # Convert to WAV using pydub
        audio = AudioSegment.from_file(temp_audio_path)
        wav_path = temp_audio_path + ".wav"
        audio.export(wav_path, format="wav")

        # Use speech recognition
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)

        return Response({"text": text})

    except Exception as e:
        return Response(
            {"detail": f"Failed to transcribe audio: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    finally:
        # Cleanup temp files
        try:
            os.unlink(temp_audio_path)
            os.unlink(wav_path)
        except:
            pass