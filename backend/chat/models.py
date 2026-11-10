from django.db import models


def message_file_path(instance, filename):
    return f"messages/{instance.channel_id}/{filename}"


class Channel(models.Model):
    """Публичный канал чата (аналог публичного канала в Telegram)."""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    is_public = models.BooleanField(default=True)
    created_by_client_id = models.CharField(
        max_length=64, blank=True, default='', db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Канал'
        verbose_name_plural = 'Каналы'

    def __str__(self):
        return self.name


class Message(models.Model):
    """Сообщение внутри канала."""
    channel = models.ForeignKey(
        Channel, on_delete=models.CASCADE, related_name='messages',
    )
    author_client_id = models.CharField(
        max_length=64, blank=True, default='', db_index=True,
    )
    author_name = models.CharField(max_length=100, blank=True, default='')
    text = models.TextField(blank=True, default='')
    file = models.FileField(
        upload_to=message_file_path, null=True, blank=True,
    )
    file_name = models.CharField(max_length=255, blank=True, default='')
    file_size = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Сообщение'
        verbose_name_plural = 'Сообщения'

    def __str__(self):
        return f'[{self.channel.name}] {self.author_client_id}: {self.text[:40]}'


class MessageRead(models.Model):
    """Прочтение сообщения конкретным клиентом (client_id)."""
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name='reads',
    )
    client_id = models.CharField(max_length=64, db_index=True)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'client_id')
        verbose_name = 'Прочтение'
        verbose_name_plural = 'Прочтения'