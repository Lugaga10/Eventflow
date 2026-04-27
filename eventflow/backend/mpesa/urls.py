from django.urls import path
from . import views

urlpatterns = [
    path("stk-push/",      views.initiate_stk_push, name="stk_push"),
    path("stk-push/bulk/", views.bulk_stk_push,     name="bulk_stk_push"),
    path("query/",         views.query_payment,      name="query_payment"),
    path("callback/",      views.mpesa_callback,     name="mpesa_callback"),
    path("transactions/",  views.transaction_list,   name="transaction_list"),
]
