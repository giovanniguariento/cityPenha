import { Component } from '@angular/core';
import { NavComponent } from '../../shared/components/nav/nav.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-favorites',
  imports: [NavComponent, RouterLink],
  templateUrl: './favorites.page.html',
  styleUrl: './favorites.page.scss'
})
export class FavoritesPage {
  // Simulando os dados da imagem
  categories: any[] = [
    { id: 1, title: 'Referências', count: 8, image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=500&auto=format&fit=crop' },
    { id: 2, title: 'Comportamento', count: 1, image: 'https://images.unsplash.com/photo-1507537297725-24a1c434b6b8?q=80&w=500&auto=format&fit=crop' },
    { id: 3, title: 'Tecnologia', count: 2, image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=500&auto=format&fit=crop' },
    { id: 4, title: 'Notícias Boas', count: 3, image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=500&auto=format&fit=crop' },
    { id: 5, title: 'Estudos', count: 1, image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=500&auto=format&fit=crop' },
  ];
}
