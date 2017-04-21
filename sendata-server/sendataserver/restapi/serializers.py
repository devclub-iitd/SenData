from restapi.models import UserInfo
from rest_framework import serializers


class UserInfoSerializer(serializers.HyperlinkedModelSerializer):
	class Meta:
		model = UserInfo
		fields = ('url', 'user', 'ipv4')
