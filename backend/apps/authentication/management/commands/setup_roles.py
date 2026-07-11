"""
Management command to set up user roles.
Usage: python manage.py setup_roles [--create-admin] [--demo]
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from apps.authentication.models import UserRole


class Command(BaseCommand):
    help = 'Set up user roles for the application'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-admin',
            action='store_true',
            help='Create an admin user',
        )
        parser.add_argument(
            '--demo',
            action='store_true',
            help='Create demo users for each role',
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username for new admin user',
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Email for new admin user',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password for new admin user',
        )

    def handle(self, *args, **options):
        """Handle command execution"""
        
        # Ensure all existing users have a role
        self.stdout.write(self.style.SUCCESS('Checking existing users...'))
        users_without_role = User.objects.filter(user_role__isnull=True)
        
        for user in users_without_role:
            UserRole.objects.create(user=user, role=UserRole.SALESPERSON)
            self.stdout.write(
                self.style.SUCCESS(f'  Created default role for: {user.username}')
            )
        
        if users_without_role.exists():
            self.stdout.write(
                self.style.SUCCESS(f'Created roles for {users_without_role.count()} users')
            )
        else:
            self.stdout.write('All existing users already have roles.')
        
        # Create admin user if requested
        if options['create_admin']:
            self.create_admin_user(options)
        
        # Create demo users if requested
        if options['demo']:
            self.create_demo_users()
        
        self.stdout.write(self.style.SUCCESS('\n✓ Role setup complete!'))

    def create_admin_user(self, options):
        """Create an admin user"""
        self.stdout.write(self.style.SUCCESS('\n--- Creating Admin User ---'))
        
        username = options.get('username') or 'test'
        email = options.get('email') or 'test@phonemagasine.com'
        password = options.get('password') or 'test1234'
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'User "{username}" already exists, skipping creation.')
            )
            return
        
        # Create admin user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=True,
            is_superuser=True
        )
        
        # Create admin role
        UserRole.objects.create(user=user, role=UserRole.ADMIN)
        
        self.stdout.write(
            self.style.SUCCESS(f'✓ Admin user created: {username}')
        )
        self.stdout.write(f'  Email: {email}')
        self.stdout.write(f'  Password: {password}')
        self.stdout.write(
            self.style.WARNING('  ⚠ Remember to change the password in production!')
        )

    def create_demo_users(self):
        """Skip demo users"""
        self.stdout.write(self.style.WARNING('Demo users are disabled.'))
