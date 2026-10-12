from django_elasticsearch_dsl import Document, Index, fields
from django_elasticsearch_dsl.registries import registry

from .models import Channel, Message


channel_index = Index('channels')
channel_index.settings(number_of_shards=1, number_of_replicas=0)


message_index = Index('messages')
message_index.settings(number_of_shards=1, number_of_replicas=0)


@registry.register_document
@channel_index.document
class ChannelDocument(Document):
    name = fields.TextField()
    description = fields.TextField()
    created_at = fields.DateField()

    class Django:
        model = Channel
        fields = []


@registry.register_document
@message_index.document
class MessageDocument(Document):
    text = fields.TextField()
    created_at = fields.DateField()

    channel = fields.ObjectField(properties={
        'id': fields.IntegerField(),
        'name': fields.TextField(),
    })
    author = fields.ObjectField(properties={
        'id': fields.IntegerField(),
        'username': fields.TextField(),
    })

    class Django:
        model = Message
        fields = []