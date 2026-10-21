from django.urls import path

from . import views

urlpatterns = [
    path('meta/', views.Meta.as_view()),
    path('programmes/', views.Programmes.as_view()),
    path('eligibility/', views.Eligibility.as_view()),
    path('choices/', views.Choices.as_view()),
    path('class/', views.ClassAnalysis.as_view()),
    path('colleges/', views.Colleges.as_view()),
]
