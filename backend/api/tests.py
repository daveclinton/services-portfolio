from rest_framework.test import APITestCase

from knowledge.models import Person


class ApiEndpointsTest(APITestCase):
    def test_health(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})

    def test_person_missing(self):
        response = self.client.get('/api/person/')
        self.assertEqual(response.status_code, 404)

    def test_person_present(self):
        Person.objects.create(name='David Clinton', title='Software Engineer', location='Kenya')
        response = self.client.get('/api/person/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'David Clinton')
