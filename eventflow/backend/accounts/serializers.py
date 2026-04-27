# accounts/serializers.py — replace entire file
from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model  = User
        fields = ["username", "email", "first_name", "last_name", "phone", "password", "role"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()

    class Meta:
        model  = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "phone", "role", "display_name",
            "org_name", "org_description", "org_website", "org_logo",
        ]


class OrganizerPublicSerializer(serializers.ModelSerializer):
    """Minimal public-facing organizer profile — no sensitive fields."""
    display_name = serializers.ReadOnlyField()

    class Meta:
        model  = User
        fields = ["id", "display_name", "org_name", "org_description", "org_website", "org_logo", "date_joined"]
