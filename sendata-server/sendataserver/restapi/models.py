from django.db import models
from django.contrib.auth.models import User

from django.db.models.signals import post_save
from django.dispatch import receiver


class UserInfo(models.Model):
	user = models.OneToOneField(User)
	ipv4 = models.GenericIPAddressField(protocol='IPv4', null=True, blank=True)

	def __str__(self):
		return str(self.user.username)


@receiver(post_save, sender=User)
def update_userinfo(sender, instance, created, **kwargs):
    if created:
        UserInfo.objects.create(user=instance)
    instance.userinfo.save()