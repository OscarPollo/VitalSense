import { Injectable, inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { User } from '../models/user.model';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { getFirestore, setDoc, doc, getDoc, addDoc, collection, collectionData, query, updateDoc, deleteDoc, deleteField, getDocs } from '@angular/fire/firestore';
import { UtilsService } from './utils.service';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { getStorage, uploadString, ref, getDownloadURL, deleteObject } from 'firebase/storage'
@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  auth = inject(AngularFireAuth);
  firestore = inject(AngularFirestore);
  utilSvc = inject(UtilsService);
  storage = inject(AngularFireStorage);

  //////////////////////////////AUTENTICACION//////////////////////////////////

  getAuth() {
    return getAuth();
  }
  //ACCEDER
  signIn(user: User) {
    return signInWithEmailAndPassword(getAuth(), user.email, user.password)
  }
  //REGISTRAR
  signUp(user: User) {
    return createUserWithEmailAndPassword(getAuth(), user.email, user.password)
  }
  //ACTUALIZAR USUARIO
  updateUser(displayName: string) {
    return updateProfile(getAuth().currentUser, { displayName })
  }
  //RESTABLECER CONTRASEÑA
  sendRecoveryEmail(email: string) {
    return sendPasswordResetEmail(getAuth(), email);
  }
  //CERRAR SESION
  signOut() {
    getAuth().signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('products');
    this.utilSvc.routerLink('/auth');
  }

  //////////////////////////////BASE DE DATOS/////////////////////////////////////

  //OBTENER DOCUMENTOS DE UNA COLECCION
  getCollectionData(path: string, collectionQuery?: any) {
    const ref = collection(getFirestore(), path)
    return collectionData(query(ref, ...collectionQuery), { idField: 'id' })
  }
  //CREAR DOCUMENTO
  setDocument(path: string, data: any) {
    return setDoc(doc(getFirestore(), path), data);
  }
  //ACTUALIZAR DOCUMENTO
  updateDocument(path: string, data: any) {
    return updateDoc(doc(getFirestore(), path), data);
  }
  //BORRAR DOCUMENTO
  deleteDocument(path: string) {
    return deleteDoc(doc(getFirestore(), path));
  }
  //BORRAR SUBCOLECCION
  async deleteSubcollection(path: string, subcollectionName: string) {
    const subcollectionRef = collection(doc(getFirestore(), path), subcollectionName);
    const querySnapshot = await getDocs(subcollectionRef);

    querySnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
  }
  //GET DOCUMENT
  async getDocument(path: string) {
    return (await getDoc(doc(getFirestore(), path))).data();
  }
  //ADD DOCUMENT
  addDocument(path: string, data: any) {
    return addDoc(collection(getFirestore(), path), data);
  }

  ///////////////////////ALMACENAMIENTO///////////////////////////////////////////
  //SUBIR IMAGEN
  async uploadImage(path: string, data_url: string) {
    return uploadString(ref(getStorage(), path), data_url, 'data_url').then(() => {
      return getDownloadURL(ref(getStorage(), path))
    })
  }

  async uploadJson(path: string, jsonData: string) {
    return uploadString(ref(getStorage(), path), jsonData, 'raw').then(() => {
      return getDownloadURL(ref(getStorage(), path));
    });
  }

  //OBTENER RUTA DE LA IMAGEN CON SU URL
  async getFilePath(url: string) {
    return ref(getStorage(), url).fullPath
  }

  //ELIMINAR ARCHIVO DEL STORAGE
  deleteFile(path: string) {
    return deleteObject(ref(getStorage(), path));
  }
}

