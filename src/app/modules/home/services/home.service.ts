import { Injectable } from '@angular/core';
import { DashboardData } from '../../../shared/interface/home.interface';
import { Observable, of } from 'rxjs';
import { ids } from '../../news/news.page';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  getResourcesHome(): Observable<DashboardData> {
    const mock = {
      "tasks": [
        {
          "name": "Leia 5 artigos",
          "progress": 80
        },
        {
          "name": "Ganhe 500 XP",
          "progress": 50
        }
      ],
      "featuredCarousel": [
        {
          "id": "artigo-001",
          "backgroundImageUrl": "https://url.da.imagem/mulher-cantando.png",
          "category": "Comportamento",
          "estimatedReadTimeMinutes": 20,
          "title": "Por que a nossa voz soa tão diferente em gravações?",
          "reward": {
            "type": "XP",
            "amount": 10
          },
          "author": {
            "name": "Fabiana Borges",
            "avatarUrl": "assets/tab-author.jpg"
          }
        },
        {
          "id": "artigo-002",
          "backgroundImageUrl": "https://url.da.imagem/outro-artigo.png",
          "category": "Cultura",
          "estimatedReadTimeMinutes": 10,
          "title": "Outro Título de Destaque",
          "reward": {
            "type": "XP",
            "amount": 15
          },
          "author": {
            "name": "Outro Autor",
            "avatarUrl": "https://url.do.avatar/outro-autor.png"
          }
        }
      ],
      "contentSection": {
        "tabs": [
          {
            "id": "para-voce",
            "title": "Para Você",
            "feed": [
              {
                "id": "artigo-100",
                "title": ids["artigo-100"].title,
                "summary": "Um resumo breve do que se trata este artigo...",
                "thumbnailUrl": ids["artigo-100"].img,
                "estimatedReadTimeMinutes": 20,
                "levelRequirement": "Nível 4+",
                "category": "Cultura",
                "reward": {
                  "type": "XP",
                  "amount": 10
                },
                "author": {
                  "name": "Fabiana Borges",
                  "avatarUrl": "assets/tab-author.jpg"
                }
              },
              {
                "id": "artigo-101",
                "title": ids["artigo-101"].title,
                "summary": "Aumente seu foco com estas técnicas comprovadas.",
                "thumbnailUrl": ids["artigo-101"].img,
                "estimatedReadTimeMinutes": 20,
                "levelRequirement": "Nível 3+",
                "category": "Cultura",
                "reward": {
                  "type": "XP",
                  "amount": 15
                },
                "author": {
                  "name": "Fabiana Borges",
                  "avatarUrl": "assets/tab-author.jpg"
                }
              },
              {
                "id": "artigo-102",
                "title": ids["artigo-102"].title,
                "summary": "Aumente seu foco com estas técnicas comprovadas.",
                "thumbnailUrl": ids["artigo-102"].img,
                "estimatedReadTimeMinutes": 20,
                "levelRequirement": "Nível 3+",
                "category": "Cultura",
                "reward": {
                  "type": "XP",
                  "amount": 15
                },
                "author": {
                  "name": "Fabiana Borges",
                  "avatarUrl": "assets/tab-author.jpg"
                }
              },
            ]
          },
          {
            "id": "cultura",
            "title": "Cultura",
            "feed": [
              {
                "id": "artigo-103",
                "title": ids["artigo-103"].title,
                "summary": "Aumente seu foco com estas técnicas comprovadas.",
                "thumbnailUrl": ids["artigo-103"].img,
                "estimatedReadTimeMinutes": 20,
                "levelRequirement": "Nível 3+",
                "category": "Cultura",
                "reward": {
                  "type": "XP",
                  "amount": 15
                },
                "author": {
                  "name": "Fabiana Borges",
                  "avatarUrl": "assets/tab-author.jpg"
                }
              },
              {
                "id": "artigo-104",
                "title": ids["artigo-104"].title,
                "summary": "Aumente seu foco com estas técnicas comprovadas.",
                "thumbnailUrl": ids["artigo-104"].img,
                "estimatedReadTimeMinutes": 20,
                "levelRequirement": "Nível 3+",
                "category": "Cultura",
                "reward": {
                  "type": "XP",
                  "amount": 15
                },
                "author": {
                  "name": "Fabiana Borges",
                  "avatarUrl": "assets/tab-author.jpg"
                }
              },
            ]
          }
        ]
      },
      "ads": [
        {
          "id": "anuncio-01",
          "title": "A academia pensada para toda familia.",
          "company": "Academia Reentry"
        },
        {
          "id": "anuncio-02",
          "title": "Chegou a hora de ser Objetivo Penha",
          "company": "Objetivo Penha"
        }
      ]
    };

    return of(mock);
  }
}
