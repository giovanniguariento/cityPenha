import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { StoreData } from './shared/store/store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {

  constructor(private store: StoreData) { }

  ngOnInit(): void {
    this.store.set('data', { name: 'City Penha', description: 'A beautiful city in Brazil' });
  }
}
