from django.shortcuts import render
from rest_framework import viewsets
from restapi.models import UserInfo
from restapi.serializers import UserInfoSerializer



class UserInfoViewSet(viewsets.ModelViewSet):
	queryset = UserInfo.objects.all()
	serializer_class = UserInfoSerializer
