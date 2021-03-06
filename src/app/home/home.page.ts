import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { SearchType, BookService, BookDB } from 'src/app/services/book.service';
import { RankingService, Ranking } from 'src/app/services/ranking.service';
import { User, LoginService } from '../services/login.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';

export interface Book {
  isbn: string,
  info: string,
  title: string,
  description: string,
  authors: string,
  reviews: string,
  expanded: boolean,
  buttonColor1: String,
  buttonColor2: String,
  buttonColor3: String,
  value: number,
  isChecked: boolean
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  isAdmin: boolean = false;
  admins: string[] = ["kvlinden@calvin.edu", "hekmanadmin"]
  results = '';
  valid = false;
  notSubmitted = true;
  toggleExpand: string;
  // GRAB ALL OF THIS FROM THE DATABASE
  books = []; /*= [{
        // intro to optics
        isbn: 'isbn:9780131499331',
        info: '',
        title: '',
        description: '',
        authors: '',
        reviews: 'https://www.amazon.com/Introduction-Optics-3rd-Frank-Pedrotti/dp/0131499335#customerReviews',
        expanded: false,
        buttonColor1: 'light',
        buttonColor2: 'light',
        buttonColor3: 'light',
        value: 0
      },
      {
        // shaping digital world
        isbn: 'isbn:9780830827138',
        info: '',
        title: '',
        description: '',
        authors: '',
        reviews: 'https://www.amazon.com/Shaping-Digital-World-Computer-Technology/dp/0830827137#customerReviews',
        expanded: false,
        buttonColor1: 'light',
        buttonColor2: 'light',
        buttonColor3: 'light',
        value: 0
      },
        {
        // stats
        isbn: 'isbn:9780470601877',
        info: '',
        title: '',
        description: '',
        authors: '',
        reviews: 'https://www.amazon.com/Statistics-Binder-Ready-Version-Unlocking/dp/1118583108#customerReviews',
        expanded: false,
        buttonColor1: 'light',
        buttonColor2: 'light',
        buttonColor3: 'light',
        value: 0
      },
      {
        // linear algebra
        isbn: 'isbn:9781429215213',
        info: '',
        title: '',
        description: '',
        authors: '',
        reviews: 'https://www.amazon.com/Linear-Algebra-Geometric-Ted-Shifrin/dp/1429215216#customerReviews',
        expanded: false,
        buttonColor1: 'light',
        buttonColor2: 'light',
        buttonColor3: 'light',
        value: 0
      }
      ]; */

  itemExpandHeight: number = 300; // was 250

  type: SearchType = SearchType.isbn;
  result: Observable<any>;
  user : User;

  constructor(private router: Router, private bookService: BookService, private rankingService: RankingService, private loginService: LoginService, 
              private db: AngularFirestore) {
    console.log("Department at homepage.ts")
    console.log(this.loginService.getDeparment())
    this.loadBooks(this.loginService.getDeparment());
    this.isAdmin = this.admins.includes(this.loginService.getUser().userID);
  }

  expandItem(item) {
      for(let i = 0; i < this.books.length; i++) {
        if (this.books[i].expanded === true && this.books[i] !== item) {
          this.books[i].expanded = false;
        }
      }
      item.expanded = !item.expanded;
      
  }

  getExpandButtonText(book : Book) {
    return book.expanded ? "Collapse" : "More Info";
  }

  voteButtonClicked(buttonNumber: number, book) {
    if (buttonNumber === 1) {
      if (book.buttonColor1 !== 'primary') {
        book.buttonColor1 = 'primary';
        book.buttonColor2 = 'light';
        book.buttonColor3 = 'light';
        book.value = 1;
      }
    } else if (buttonNumber === 2) {
      if (book.buttonColor2 !== 'primary') {
        book.buttonColor1 = 'light';
        book.buttonColor2 = 'primary';
        book.buttonColor3 = 'light';
        book.value = 2;
      }
    } else if (buttonNumber === 3) {
      if (book.buttonColor3 !== 'primary') {
        book.buttonColor1 = 'light';
        book.buttonColor2 = 'light';
        book.buttonColor3 = 'primary';
        book.value = 3;
      }
    }
  }

  submitButton() {
    this.valid = true;
    // for (let i = 0; i < this.books.length; i++) {
    //   if (this.books[i].value === 0) {
    //     this.valid = false;
    //   }
    // }

    // if (!this.valid) {
    //   this.results = '';
    //   alert('Please rate all books.');
    // } else {
    //   // do nothing
    // }
    
    // Set Ranking
    console.log("Every book")
    console.log(this.books)
    
    this.books = this.books.filter(book => book.value > 0).map(book => {
      let sanitizedBook = book
      if(sanitizedBook.eBook === undefined) {
        sanitizedBook.eBook = false
      }
      sanitizedBook.isbn = sanitizedBook.isbn.replace("isbn:", "");
      return sanitizedBook
    });
    console.log("Books Voted on")
    console.log(this.books)
    this.books.forEach(book => {
      let ranking = this.createRanking(book);
      console.log("Ranking for Book #" + this.books.indexOf(book))
      console.log(ranking);
      this.rankingService.addRanking(ranking);
    });

    this.notSubmitted = false;

    // let know that it was successful
    alert('Successfully Submitted!');
    
  }

  createRanking(book : Book) {
    let ranks = { bookISBN : book.isbn, bookTitle : book.title, score : book.value, eBook : book.isChecked === true };

    let user = this.loginService.getUser();
    let ranking : Ranking = Object.assign(ranks, user);
    return ranking;
  }

  async loadBooks(department) {
    // get the books in the data base -> change this for only current ones with correct department
    const booksCollection = this.db.collection<BookDB>('/books', ref => ref.where('department', '==', department).where('archived', '==', false));
    // get the data from the books
    const booksArray = booksCollection.snapshotChanges().pipe(
      map(actions => {
        return actions.map(a => {
          const data = a.payload.doc.data();
          const id = a.payload.doc.id;
          return { id, ...data };
        });
      })
    );

    // go through all of the books and add them to the global variable
    booksArray.subscribe(books => {
      books.forEach(element => {
        //console.log(element.isbn);
        this.books.push({
          isbn: element.isbn,
          info: '',
          title: element.title,
          description: '',
          authors: '',
          reviews: element.reviewPage,
          expanded: false,
          buttonColor1: 'light',
          buttonColor2: 'light',
          buttonColor3: 'light',
          value: 0
        });
      });
    });

    await this.delay(1000); // delay a second so we have all of the books

    for (let i = 0; i < this.books.length; i++) {
      this.bookService.getObservable("isbn:" + this.books[i].isbn).subscribe(
        data => {
          // populate the titles
          try {
            //this.books[i].title = data[0].volumeInfo.title;
            // populate the descriptions
            // check if the description is too long and truncate it
            if (data[0].volumeInfo.description.length > 1200) {
              this.books[i].description = data[0].volumeInfo.description.slice(0, 1200) + '...';
            } else {
              this.books[i].description = data[0].volumeInfo.description;
            }
            // populate the authors
            this.books[i].authors = data[0].volumeInfo.authors;
            // add titleAuthors field so it is easy to display the authors in the title bar and handle
            // when there is no data available
            this.books[i].titleAuthors = '- ' + data[0].volumeInfo.authors;
          } catch (error) {
            //this.books[i].title = realTitle;
            this.books[i].authors = 'No data available';
            this.books[i].titleAuthors = '';
            this.books[i].description = 'No description available';
          }
      });
    }
    this.user = this.loginService.getUser();

  }

  // found this function to delay at: https://stackoverflow.com/questions/37764665/typescript-sleep
  // needed this so we can upload a new list of books, and archive the old books without accidentally archiving
  // the current books we just uploaded
  delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }

  adminHandler() {
    this.router.navigateByUrl('admin');
  }

}
