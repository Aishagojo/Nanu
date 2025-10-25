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

    original_path = None
    wav_path = None
    try:
        with NamedTemporaryFile(suffix=os.path.splitext(upload.name or "")[1] or ".m4a", delete=False) as temp_in:
            for chunk in upload.chunks():
                temp_in.write(chunk)
            original_path = temp_in.name

        audio = AudioSegment.from_file(original_path)
        with NamedTemporaryFile(suffix=".wav", delete=False) as temp_out:
            audio.export(temp_out.name, format="wav")
            wav_path = temp_out.name

        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data)
        except sr.UnknownValueError:
            text = ""
        except sr.RequestError as exc:
            return Response({"detail": f"Transcription service error: {exc}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({"text": text})
    except FileNotFoundError as exc:
        return Response({"detail": f"Decoder error: {exc}"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response({"detail": f"Unable to transcribe audio: {exc}"}, status=status.HTTP_400_BAD_REQUEST)
    finally:
        for path in (original_path, wav_path):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
