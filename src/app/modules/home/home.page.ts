import { Component, OnInit } from '@angular/core';
import { StoreData } from '../../shared/store/store';
import { NavComponent } from '../../shared/components/nav/nav.component'
import { HeaderComponent } from '../../shared/components/header/header.component'
import { CardNoticiaComponent } from '../home/components/card-noticia/card-noticia.component'
import { CardExpComponent } from '../home/components/card-exp/card-exp.component'
import { TabsComponent } from '../home/components/tabs/tabs.component'

@Component({
  selector: 'app-home',
  imports: [NavComponent, HeaderComponent, CardNoticiaComponent, CardExpComponent, TabsComponent],
  templateUrl: './home.page.html',
  standalone: true,
  styleUrl: './home.page.scss'
})
export class Home implements OnInit {

  constructor(private store: StoreData) { }

  ngOnInit(): void {
    this.store.getData().subscribe((data) => { console.log(data) });
  }

}
