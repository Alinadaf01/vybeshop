from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

phone_validator = RegexValidator(
    regex=r"^09\d{9}$",
    message="شماره موبایل باید به‌صورت ۰۹xxxxxxxxx باشد.",
)


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, phone, password, **extra_fields):
        if not phone:
            raise ValueError("کاربر باید شماره موبایل داشته باشد.")
        user = self.model(phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(phone, password, **extra_fields)

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_verified", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("سوپریوزر باید is_staff=True باشد.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("سوپریوزر باید is_superuser=True باشد.")
        return self._create_user(phone, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Staff can create a user directly with is_verified=True, bypassing OTP."""

    phone = models.CharField(max_length=11, unique=True, validators=[phone_validator])
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.phone

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.phone

    def get_short_name(self):
        return self.first_name or self.phone


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    title = models.CharField(max_length=50, blank=True)
    province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    line = models.TextField()
    postal_code = models.CharField(max_length=10)
    receiver_name = models.CharField(max_length=150)
    receiver_phone = models.CharField(max_length=11, validators=[phone_validator])
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return f"{self.title or self.city} — {self.user.phone}"


class OTPCode(models.Model):
    EXPIRY_MINUTES = 2
    MAX_ATTEMPTS = 5
    RATE_LIMIT_COUNT = 3
    RATE_LIMIT_MINUTES = 10

    phone = models.CharField(max_length=11, validators=[phone_validator])
    code_hash = models.CharField(max_length=128)
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["phone", "created_at"])]

    def __str__(self):
        return f"OTP for {self.phone}"

    @classmethod
    def issue(cls, phone: str, raw_code: str) -> "OTPCode":
        return cls.objects.create(
            phone=phone,
            code_hash=make_password(raw_code),
            expires_at=timezone.now() + timezone.timedelta(minutes=cls.EXPIRY_MINUTES),
        )

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def verify(self, raw_code: str) -> bool:
        if self.used_at or self.is_expired() or self.attempts >= self.MAX_ATTEMPTS:
            return False
        self.attempts += 1
        ok = check_password(raw_code, self.code_hash)
        if ok:
            self.used_at = timezone.now()
        self.save(update_fields=["attempts", "used_at"])
        return ok
