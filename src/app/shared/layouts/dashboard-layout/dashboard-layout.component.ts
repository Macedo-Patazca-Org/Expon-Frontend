import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.css']
})
export class DashboardLayoutComponent implements OnInit {
  isCollapsed = false;

  ngOnInit(): void {
    // Detectar tamaño de pantalla
    this.isCollapsed = window.innerWidth < 1024;

    // Escuchar cambios en el tamaño de ventana
    window.addEventListener('resize', () => {
      this.isCollapsed = window.innerWidth < 1024;
    });
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
