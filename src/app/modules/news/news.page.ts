import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router'

export const ids: any = {
  'artigo-100': {
    title: "Câmara aprova texto-base da reforma tributária após intensa negociação",
    // Imagem que remete à aprovação no Congresso
    img: "https://s2-g1.glbimg.com/DqClaErc7qcvlAyp7KDcc2aAuio=/0x0:1984x1223/1008x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_59edd422c0c84a879bd37670ae4f538a/internal_photos/bs/2023/3/M/wJ9TiiRmueSAbw527UHg/camara.jpg"
  },
  'artigo-101': {
    title: "Inflação desacelera em outubro e atinge o menor patamar em 12 meses, aponta IBGE",
    // Imagem genérica de gráfico de queda ou indicadores econômicos
    img: "https://jornalnoroeste.com.br/files/images/image_a6c8b19322d9f8.jpg"
  },
  'artigo-102': {
    title: "Pesquisa indica que nova vacina contra gripe tem eficácia de 95% em idosos",
    // Imagem de idosos recebendo vacina ou seringa (genérico de saúde)
    img: "https://butantan.gov.br/assets/avacinasinfluenza_interna.jpg"
  },
  'artigo-103': {
    title: "Tempestade solar atinge a Terra e pode causar interrupções em sistemas de GPS e rádio",
    // Imagem de uma aurora boreal/austral causada por tempestade solar
    img: "https://s1.static.brasilescola.uol.com.br/be/2023/11/tempestade-solar-ocorrendo-no-espaco-com-a-presenca-do-planeta-terra-um-pouco-ao-fundo.jpg"
  },
  'artigo-104': {
    title: "Time da casa vence clássico regional com gol de bicicleta nos acréscimos do segundo tempo",
    // Imagem de um lance de futebol com gol de bicicleta
    img: "https://www.rbsdirect.com.br/filestore/9/8/2/5/4/0/5_9666db3daef2e41/5045289_88d218c01aadfe8.jpg?w=700"
  }
};

@Component({
  selector: 'app-news-page',
  imports: [RouterLink, CommonModule],
  templateUrl: './news.page.html',
  styleUrl: './news.page.scss'
})
export class NewsPageComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private newsId: string = "";
  news: any;
  following: boolean = false;
  bookmarked: boolean = false;

  readingTime: number = 0;

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.newsId = params['id'];
      this.news = ids[params['id']];
    });
  }

  ngOnInit(): void {
    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;

      let scrolled = (winScroll / height) * 100;
      if (height - winScroll <= 60) {
        scrolled = 100;
      }

      this.readingTime = Math.min(100, Math.max(0, scrolled));
    });
  }

  getBackgroundImageUrl(): string {
    // The value must be formatted as a CSS string: 'url(...)'
    console.log("oaiso")
    return `url('${this.news.img}')`;
  }

  async share(): Promise<void> {
    try {
      const shareData = {
        title: "Acesse o CityPenha",
        text: "Veja agora essa noticia",
        url: window.location.href,
      };
      await navigator.share(shareData);
    } catch (error) {
      alert(error)
    }
  }
}
