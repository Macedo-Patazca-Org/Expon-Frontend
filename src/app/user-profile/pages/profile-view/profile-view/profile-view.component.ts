import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../models/user.model';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile-view.component.html',
  styleUrls: ['./profile-view.component.css']
})
export class ProfileViewComponent implements OnInit {
  user: User = {
    id: 1,
    email: 'luis.perez@example.com',
    name: 'Luis',
    lastname: 'Perez',
    // Puedes añadir más propiedades según tu modelo (gender, plan, etc.)
  };

  ngOnInit(): void {
    // En el futuro puedes cargarlo desde un servicio
  }
}
