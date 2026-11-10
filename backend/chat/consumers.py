import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.channel_id = self.scope["url_route"]["kwargs"]["channel_id"]
        self.group_name = f"chat_{self.channel_id}"

        # client_id из query string (?client_id=...)
        query_string = self.scope.get("query_string", b"").decode()
        params = dict(
            p.split("=", 1) for p in query_string.split("&") if "=" in p
        )
        self.client_id = params.get("client_id", "")[:64]

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name, self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        text = (data.get("message") or "").strip()
        author_name = (data.get("author_name") or "").strip()[:100]

        if not text and not data.get("file_id"):
            return

        from .models import Message, Channel

        channel = await database_sync_to_async(Channel.objects.get)(
            id=self.channel_id
        )

        msg = await database_sync_to_async(Message.objects.create)(
            channel=channel,
            author_client_id=self.client_id,
            author_name=author_name,
            text=text,
        )

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_message",
                "id": msg.id,
                "message": text,
                "author_client_id": self.client_id,
                "author_name": author_name,
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "id": event["id"],
            "message": event["message"],
            "author_client_id": event["author_client_id"],
            "author_name": event["author_name"],
        }))