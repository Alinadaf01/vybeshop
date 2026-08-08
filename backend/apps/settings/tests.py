import json

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.settings.models import ApiCredential


class ApiCredentialValidationTests(TestCase):
    def test_active_credential_requires_nonempty_credentials(self):
        credential = ApiCredential(service="zarinpal", is_active=True, credentials="")
        with self.assertRaises(ValidationError):
            credential.full_clean()

    def test_active_credential_requires_valid_json(self):
        credential = ApiCredential(service="zarinpal", is_active=True, credentials="not json")
        with self.assertRaises(ValidationError):
            credential.full_clean()

    def test_active_credential_requires_nonempty_object(self):
        credential = ApiCredential(service="zarinpal", is_active=True, credentials="{}")
        with self.assertRaises(ValidationError):
            credential.full_clean()

    def test_active_credential_with_valid_json_passes(self):
        credential = ApiCredential(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "abc"})
        )
        credential.full_clean()  # must not raise

    def test_inactive_credential_with_empty_credentials_is_allowed(self):
        credential = ApiCredential(service="zarinpal", is_active=False, credentials="")
        credential.full_clean()  # must not raise — inactive rows can be placeholders

    def test_has_valid_credentials_helper(self):
        valid = ApiCredential.objects.create(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "abc"})
        )
        self.assertTrue(valid.has_valid_credentials())

        # Bypasses clean() on purpose (bulk update / fixture / migration path)
        # to prove the public endpoint can't be fooled by a row that skipped
        # the model-form validation.
        broken = ApiCredential.objects.create(service="idpay", is_active=True, credentials="")
        self.assertFalse(broken.has_valid_credentials())


class PaymentGatewayListApiTests(APITestCase):
    def test_only_active_gateways_with_valid_credentials_are_listed(self):
        ApiCredential.objects.create(
            service="zarinpal",
            is_active=True,
            credentials=json.dumps({"merchantId": "abc"}),
            order=1,
        )
        ApiCredential.objects.create(
            service="idpay",
            is_active=True,
            credentials=json.dumps({"apiKey": "xyz"}),
            order=2,
        )
        # Disabled — must not appear even though credentials are fine.
        ApiCredential.objects.create(
            service="snapppay",
            is_active=False,
            credentials=json.dumps({"clientId": "x"}),
            order=3,
        )
        # Enabled but broken credentials (created via bulk .create(), so
        # clean() never ran) — the endpoint's own re-check must catch this.
        ApiCredential.objects.create(service="digipay", is_active=True, credentials="", order=4)
        # Non-payment service must never leak into this list.
        ApiCredential.objects.create(
            service="kavenegar", is_active=True, credentials=json.dumps({"apiKey": "k"})
        )

        response = self.client.get(reverse("payment-gateway-list"))
        self.assertEqual(response.status_code, 200)
        codes = [g["code"] for g in response.data]
        self.assertEqual(codes, ["ZARINPAL", "IDPAY"])

    def test_empty_list_when_no_gateway_is_configured(self):
        response = self.client.get(reverse("payment-gateway-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
