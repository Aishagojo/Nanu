from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

class AskView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        query = request.data.get('query', '').lower()
        
        # Simple rule-based response for now
        if 'assignment' in query:
            response_text = 'You can find your assignments in the "Assignments" section.'
        elif 'fee' in query:
            response_text = 'You can check your fee status in the "Finance" section.'
        elif 'hello' in query or 'hi' in query:
            response_text = 'Hello! How can I help you today?'
        else:
            response_text = "I'm sorry, I don't have information about that right now. Please try asking about assignments or fees."
        
        return Response({
            "text": response_text,
            "visual_cue": None
        })
